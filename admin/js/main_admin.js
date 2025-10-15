const prot = window.location.protocol === 'file:' ? 'http:' : window.location.protocol;
const types = ['weekday', 'shabbat', 'lesson', 'activity', 'shabbatTimes'];

// מיפוי type ל־ID
function typeToId(type) {
  return {
    weekday: 'weekday-prayers',
    shabbat: 'shabbat-prayers',
    lesson: 'lessons',
    activity: 'activities',
    shabbatTimes: 'shabbat-times'
  }[type];
}

// יצירת שורה חדשה
function addRow(type, data = null) {
  const container = document.getElementById(typeToId(type));
  const row = document.createElement("div");
  row.className = "time-entry";

  const visible = data?.visible ?? true;

  // גרירה
  const handle = document.createElement("span");
  handle.className = "drag-handle";
  handle.textContent = "☰";
  row.appendChild(handle);

  // תיאור
  const desc = document.createElement("input");
  desc.type = "text";
  desc.className = "desc";
  desc.placeholder = "תיאור";
  desc.value = data?.description || "";
  row.appendChild(desc);

  // סוג זמן
  const timeType = document.createElement("select");
  timeType.className = "time-type";
  [["exact","שעה מדויקת"],["relative","יחס לשקיעה"]].forEach(([val,text])=>{
    const opt = document.createElement("option");
    opt.value = val; opt.textContent = text;
    timeType.appendChild(opt);
  });
  timeType.value = data?.time_type || "exact";
  row.appendChild(timeType);

  // ערך זמן מדויק
  const timeExact = document.createElement("input");
  timeExact.type = "time";
  timeExact.className = "time-value-exact";
  timeExact.value = data?.time_type === "exact" ? data.time_value : "";
  timeExact.style.display = timeType.value === "exact" ? "inline-block" : "none";
  row.appendChild(timeExact);

  // ערך זמן יחסי
  const timeRel = document.createElement("input");
  timeRel.type = "number";
  timeRel.className = "time-value-relative";
  timeRel.placeholder = "±דקות";
  timeRel.value = data?.time_type === "relative" ? data.time_value : "";
  timeRel.style.display = timeType.value === "relative" ? "inline-block" : "none";
  row.appendChild(timeRel);

  timeType.addEventListener("change", function () {
    timeExact.style.display = this.value === "exact" ? "inline-block" : "none";
    timeRel.style.display   = this.value === "relative" ? "inline-block" : "none";
  });

  // יום בשבוע בשיעורים בלבד
  if (type === "lesson") {
    const daySelect = document.createElement("select");
    daySelect.className = "lesson-day";
    ["","ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"].forEach(d=>{
      const opt = document.createElement("option");
      opt.value = d; opt.textContent = d || "בחר יום";
      if (data?.day === d) opt.selected = true;
      daySelect.appendChild(opt);
    });
    row.appendChild(daySelect);
  }

  // הצגה/הסתרה של שורה
  const labelVisible = document.createElement("label");
  const inputVisible = document.createElement("input");
  inputVisible.type = "checkbox";
  inputVisible.className = "row-visible";
  inputVisible.checked = visible;
  labelVisible.appendChild(inputVisible);
  labelVisible.appendChild(document.createTextNode(" הצג"));
  row.appendChild(labelVisible);

  // מחיקה
  const btnRemove = document.createElement("button");
  btnRemove.textContent = "🗑";
  btnRemove.onclick = () => row.remove();
  row.appendChild(btnRemove);

  container.appendChild(row);
}

// אתחול גרירה לכל הסקשנים
function initSortables() {
  types.forEach(type => {
    const container = document.getElementById(typeToId(type));
    if (!container || container.dataset.sortableInit) return; // למנוע אתחול כפול
    Sortable.create(container, {
      handle: ".drag-handle",
      animation: 150,
      ghostClass: "drag-ghost"
    });
    container.dataset.sortableInit = "true";
  });
}

// שמירה
function saveTimes() {
  const data = {};
  types.forEach(type => {
    const container = document.getElementById(typeToId(type));
    const rows = container.querySelectorAll(".time-entry");
    const sectionCheckbox = document.querySelector(`.section-visible[data-type="${type}"]`);
    const sectionTitle = document.querySelector(`.section-title[data-type="${type}"]`);

    data[type] = {
      visible: sectionCheckbox?.checked ?? true,
      title: sectionTitle?.value.trim() || "",
      items: []
    };

    rows.forEach(row => {
      const desc = row.querySelector(".desc").value.trim();
      const timeType = row.querySelector(".time-type").value;
      const timeVal = timeType === 'exact'
        ? row.querySelector(".time-value-exact").value.trim()
        : row.querySelector(".time-value-relative").value.trim();
      const rowVisible = row.querySelector(".row-visible")?.checked ?? true;
      if (desc && timeVal) {
        const item = { description: desc, time_type: timeType, time_value: timeVal, visible: rowVisible };
        if (type === 'lesson') item.day = row.querySelector(".lesson-day").value;
        data[type].items.push(item);
      }
    });
  });

  fetch(prot + "//www.shokeda.co.il/board/ajax.php?method=save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
    .then(r => r.json())
    .then(() => {
      alert("✅ הנתונים נשמרו!");
      loadTimes();
    })
    .catch(() => alert("❌ שגיאה בשמירה"));
}

// טעינה
function loadTimes() {
  fetch(prot + "//www.shokeda.co.il/board/ajax.php?method=load")
    .then(r => r.json())
    .then(data => {
      types.forEach(type => {
        const container = document.getElementById(typeToId(type));
        container.innerHTML = "";

        const sectionCheckbox = document.querySelector(`.section-visible[data-type="${type}"]`);
        const sectionTitle = document.querySelector(`.section-title[data-type="${type}"]`);

        if (sectionCheckbox && data[type]?.visible !== undefined) {
          sectionCheckbox.checked = data[type].visible;
        }
        if (sectionTitle && data[type]?.title) {
          sectionTitle.value = data[type].title;
        }

        if (data[type]?.items) {
          data[type].items.forEach(entry => addRow(type, entry));
        }

        // לאתחל גרירה אחרי יצירת השורות
        Sortable.create(container, {
          handle: ".drag-handle",
          animation: 150,
          ghostClass: "drag-ghost"
        });
      });
    })
    .catch(() => console.warn("⚠️ לא ניתן לטעון נתונים שמורים"));
}

window.onload = function () {
  loadTimes();
  initSortables();
};
