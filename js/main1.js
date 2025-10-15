var prot = window.location.protocol === 'file:' ? 'http:' : window.location.protocol;
var lat = 31.433;
var lon = 34.566;

var translateZman = {
  alotHaShachar: 'עלות השחר',
  sunrise: 'הנץ החמה',
  sofZmanShmaMGA: 'סוף זמן קריאת שמע (מג״א)',
  sofZmanShma: 'סוף זמן קריאת שמע (גר״א)',
  sofZmanTfillaMGA: 'סוף זמן תפילה (מג״א)',
  sofZmanTfilla: 'סוף זמן תפילה (גר״א)',
  chatzot: 'חצות',
  plagHaMincha: 'פלג המנחה',
  sunset: 'שקיעה',
  tzeit42min: 'צאת הכוכבים'
};

var sunset;
var curTime = '';

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function formatTime(date) { return pad2(date.getHours()) + ':' + pad2(date.getMinutes()); }

function formatWeekday(date) {
  var weekdays = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','יום שישי','שבת'];
  return weekdays[date.getDay()];
}

function httpGet(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) callback(null, xhr.responseText);
      else callback(new Error('Status ' + xhr.status));
    }
  };
  try {
    xhr.open('GET', url, true);
    xhr.send(null);
  } catch (e) {
    callback(e);
  }
}

function loadContent() {
  httpGet(prot + '//www.shokeda.co.il/board/ajax.php?method=load', function (err, data) {
    if (!err && data) renderTimes(JSON.parse(data));
  });
}

function getCurrentTime() {
  var now = new Date();
  var time = formatTime(now);
  curTime = time;
  var el = document.getElementById('clock');
  if (el) el.innerHTML = time;
}

function loadHebrewDateAndTimes() {
  var today = new Date();
  var url = 'https://www.hebcal.com/converter?cfg=json&gy=' + today.getFullYear() + '&gm=' + (today.getMonth() + 1) + '&gd=' + today.getDate() + '&g2h=1';
  
  httpGet(url, function(err, responseText) {
    if (err) return;
    var data;
    try { data = JSON.parse(responseText); } catch(e) { return; }
    var hebDate = data.hebrew ? data.hebrew.split(' תש')[0] : '';

    var shabbatUrl = 'https://www.hebcal.com/shabbat/?cfg=json&latitude=' + lat + '&longitude=' + lon + '&M=on&lg=he';
    httpGet(shabbatUrl, function(err2, responseText2) {
      if (err2) return;
      var data2;
      try { data2 = JSON.parse(responseText2); } catch(e) { return; }

      var parashaItem = null;
      for (var i = 0; i < data2.items.length; i++) {
        if (data2.items[i].category === 'parashat') {
          parashaItem = data2.items[i];
          break;
        }
      }

      var hebTimes = formatWeekday(new Date());
      var parashaHTML = '';
      if (parashaItem) {
        parashaHTML = '<div class="parasha">' +
          parashaItem.hebrew + ' <span class="separator">|</span> ' +
          hebTimes + ' ' + hebDate + '<span class="separator">|</span><span id="clock">' + curTime + '</span></div>';
      }
      var el = document.getElementById('parasha');
      if (el) el.innerHTML = parashaHTML;

      getCurrentTime();
    });
  });
}

function getTimeRelativeToSunset(offsetMinutes) {
  var sunsetDate = new Date(sunset);
  var resultDate = new Date(sunsetDate.getTime() + offsetMinutes * 60 * 1000);
  return formatTime(resultDate);
}

function loadZmanim() {
  getDailyTorahInHebrew();
  var url = 'https://www.hebcal.com/zmanim?cfg=json&latitude=' + lat + '&longitude=' + lon;
  httpGet(url, function(err, responseText) {
    if (err) return;
    var data;
    try { data = JSON.parse(responseText); } catch(e) { return; }
    var zmanim = data.times;

    // תיקון לפורמט זמן לדפדפנים ישנים
    var sunsetStr = zmanim.sunset.replace(/-/g,'/').replace('T',' ').split('+')[0];
    sunset = new Date(sunsetStr);

    var html = '';
    var i = 0;
    for (var key in translateZman) {
      if (translateZman.hasOwnProperty(key)) {
        if (i > 0) html += '<div class="separator gray"></div>';
        i++;
        if (key === 'tzeit42min') {
          var sunriseStr = zmanim.sunrise.replace(/-/g,'/').replace('T',' ').split('+')[0];
          zmanim[key] = addZmaniyotMinutesToDate(new Date(sunsetStr), dakaZmanit(new Date(sunriseStr), new Date(sunsetStr)), 18);
        }
        var timeDate = new Date(zmanim[key]);
        html += '<div class="time"><div>' + translateZman[key] + '</div><div>' + formatTime(timeDate) + '</div></div>';
      }
    }
    var el = document.getElementById('zmanim');
    if (el) el.innerHTML = '<div class="times">' + html + '</div>';
  });
}

function getDailyTorahInHebrew() {
  httpGet('https://www.sefaria.org/api/calendars?lang=he', function(err, responseText) {
    if (err) return;
    var calendar;
    try { calendar = JSON.parse(responseText); } catch(e) { return; }

    var dafYomi = null;
    var rambam = null;
    for (var i = 0; i < calendar.calendar_items.length; i++) {
      var item = calendar.calendar_items[i];
      if (item.title && item.title.en === 'Daf Yomi') dafYomi = item;
      if (item.title && item.title.en === 'Daily Rambam (3 Chapters)') rambam = item;
    }

    var html = '<div class="times">';
    html += '<div class="time"><div>דף יומי</div><div>' + (dafYomi && dafYomi.displayValue && dafYomi.displayValue.he ? dafYomi.displayValue.he : '') + '</div></div>';
    html += '<div class="separator gray"></div>';
    html += '<div class="time"><div>רמב"ם יומי</div><div>' + (rambam && rambam.displayValue && rambam.displayValue.he ? rambam.displayValue.he : '') + '</div></div>';
    html += '</div>';

    var el = document.getElementById('daily');
    if (el) el.innerHTML = html;
  });
}

function getItemTime(item, i) {
  var display = '';
  if (i > 0) display += '<div class="separator gray"></div>';
  display += '<div class="time"><div>' + item.description + '</div>';

  if (item.day) {
    display += '<div class="day-time"><span class="day-column">' + item.day + '</span>';
  } else {
    display += '<div>';
  }

  if (item.time_type === 'exact') {
    display += item.time_value;
  } else if (item.time_type === 'relative') {
    var offset = parseInt(item.time_value, 10);
    if (sunset) {
      var calcTime = getTimeRelativeToSunset(offset);
      var parts = calcTime.split(':');
      var date = new Date(1970, 0, 1, parts[0], parts[1]);
      var ms = date.getTime();
      var rounded = new Date(Math.ceil(ms / (5*60*1000)) * (5*60*1000));
      display += pad2(rounded.getHours()) + ':' + pad2(rounded.getMinutes());
    } else {
      display += '(' + (offset>0?'+':'') + offset + ' דקות מהשקיעה)';
    }
  }
  display += '</div>';
  return display;
}

function renderSection(items, containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = '<div>אין נתונים זמינים</div>';
    return;
  }

  var visibleItems = [];
  for (var i=0;i<items.length;i++) {
    if (items[i].visible !== false) visibleItems.push(items[i]);
  }

  if (visibleItems.length === 0) {
    container.innerHTML = '<div>אין נתונים זמינים</div>';
    return;
  }

  for (var j=0;j<visibleItems.length;j++) {
    var div = document.createElement('div');
    div.className = 'times';
    div.innerHTML = getItemTime(visibleItems[j], j);
    container.appendChild(div);
  }
}

function renderTimes(data) {
  function renderBlock(sectionData, sectionId, containerId) {
    if (!sectionData || sectionData.visible === false) return;
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (sectionData.title) {
      var titleDiv = document.createElement('div');
      titleDiv.className = 'content-title';
      titleDiv.textContent = sectionData.title;
      container.appendChild(titleDiv);
    }

    var bodyDiv = document.createElement('div');
    bodyDiv.id = sectionId;
    container.appendChild(bodyDiv);

    renderSection(sectionData.items, sectionId);
  }

  renderBlock(data.weekday, 'weekday-times', 'weekday-section');
  renderBlock(data.shabbat, 'shabbat-times', 'shabbat-section');
  renderBlock(data.lesson, 'lesson-times', 'lesson-section');

  if (data.shabbatTimes && data.shabbatTimes.visible !== false) {
    var shabbatTimesContent = [];
    for (var i = 0; i < data.shabbatTimes.items.length; i++) {
      if (data.shabbatTimes.items[i].visible !== false) {
        shabbatTimesContent.push(getItemTime(data.shabbatTimes.items[i], i));
      }
    }
    var el = document.getElementById('shabat-times');
    if (el) el.innerHTML = '<div class="times">' + shabbatTimesContent.join('<span class="separator">|</span>') + '</div>';
  }
}

function dakaZmanit(sunriseDate, sunsetDate) {
  return ((sunsetDate.getTime() - sunriseDate.getTime()) / 720);
}

function addZmaniyotMinutesToDate(baseDate, dakaMillis, zmaniyotMinutes) {
  return new Date(baseDate.getTime() + dakaMillis * zmaniyotMinutes);
}

function init() {
  loadContent();
  loadHebrewDateAndTimes();
  loadZmanim();
  setInterval(loadContent, 3600000);
  setInterval(loadHebrewDateAndTimes, 21600000);
  setInterval(loadZmanim, 43200000);
  setInterval(getCurrentTime, 30000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
