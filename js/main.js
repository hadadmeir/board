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

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatTime(date) {
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
}

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
    if (!err && data) {
      renderTimes(JSON.parse(data));
    }
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

  httpGet(url, function (err, responseText) {
    if (err) return;

    var data;
    try { data = JSON.parse(responseText); } catch (e) { return; }
    var hebDate = data.hebrew ? data.hebrew.split(' תש')[0] : '';

    var shabbatUrl = 'https://www.hebcal.com/shabbat/?cfg=json&latitude=' + lat + '&longitude=' + lon + '&M=on&lg=he';
    httpGet(shabbatUrl, function (err2, responseText2) {
      if (err2) return;

      var data2;
      try { data2 = JSON.parse(responseText2); } catch (e) { return; }
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
  httpGet(url, function (err, responseText) {
    if (err) return;

    var data;
    try { data = JSON.parse(responseText); } catch (e) { return; }
    var zmanim = data.times;
	
	sunset = zmanim.sunsetף
    var html = '';
    var i = 0;
    for (var key in translateZman) {
      if (translateZman.hasOwnProperty(key)) {
        if (i > 0) {
          html += '<div class="separator gray"></div>';
        }
        i++;
        if (key === 'tzeit42min') {
          zmanim[key] = addZmaniyotMinutesToDate(new Date(zmanim.sunset), dakaZmanit(zmanim.sunrise, zmanim.sunset), 18); // d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':00';
        }
        var time = formatTime(new Date(zmanim[key]));
        html += '<div class="time"><div>' + translateZman[key] + '</div><div>' + time + '</div></div>';
      }
    }

    var el = document.getElementById('zmanim');
    if (el) el.innerHTML = '<div class="times">' + html + '</div>';
  });
}

function getDailyTorahInHebrew() {
  httpGet('https://www.sefaria.org/api/calendars?lang=he', function (err, responseText) {
    if (err) {
      return;
    }

    var calendar;
    try { calendar = JSON.parse(responseText); } catch (e) { return; }
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
  if (i > 0) {
    display += '<div class="separator gray"></div>';
  }
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
      var rounded = new Date(Math.ceil(ms / (5 * 60 * 1000)) * (5 * 60 * 1000));
      var h = pad2(rounded.getHours());
      var m = pad2(rounded.getMinutes());
      display += h + ':' + m;
    } else {
      display += '(' + (offset > 0 ? '+' : '') + offset + ' דקות מהשקיעה)';
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

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var display = getItemTime(item, i);
    var div = document.createElement('div');
    div.className = 'times';
    div.innerHTML = display;
    container.appendChild(div);
  }
}

function renderTimes(data) {
  renderSection(data.weekday, 'weekday-times');
  renderSection(data.shabbat, 'shabbat-times');
  renderSection(data.lesson, 'lesson-times');

  if (data.shabbatTimes) {
    var shabbatTimesContent = [];
    for (var i = 0; i < data.shabbatTimes.length; i++) {
      shabbatTimesContent.push(getItemTime(data.shabbatTimes[i], i));
    }
    var el = document.getElementById('shabat-times');
    if (el) el.innerHTML = '<div class="times">' + shabbatTimesContent.join('<span class="separator">|</span>') + '</div>';
  }
}

function dakaZmanit(sunriseIso, sunsetIso) {
    function isoToMinutes(isoStr) {
        var timePart = isoStr.split("T")[1];
        var hm = timePart.split(":");
        var h = parseInt(hm[0], 10);
        var m = parseInt(hm[1], 10);
        return h * 60 + m;
    }

    var sunriseMin = isoToMinutes(sunriseIso);
    var sunsetMin  = isoToMinutes(sunsetIso);

    var dayLengthMinutes = sunsetMin - sunriseMin;
    var dayLengthMillis  = dayLengthMinutes * 60 * 1000;

    return dayLengthMillis / 720;
}

function addZmaniyotMinutesToDate(baseDate, dakaMillis, zmaniyotMinutes) {
    var addMillis = dakaMillis * zmaniyotMinutes;
    return new Date(baseDate.getTime() + addMillis);
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
  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    window.attachEvent('onload', init);
  }
} else {
  init();
}
