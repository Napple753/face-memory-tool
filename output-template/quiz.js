// Quiz + browse logic for the final deliverable HTML.
// Gets inlined into template.html by html_generator.py at export time.
// Relies on MEMBER_DATA / IMAGE_WIDTH / IMAGE_HEIGHT, injected in the
// preceding <script> block. No progress persistence -- resets on reload.

(function () {
  'use strict';

  var tabBrowse = document.getElementById('tab-browse');
  var tabQuiz = document.getElementById('tab-quiz');
  var viewBrowse = document.getElementById('view-browse');
  var viewQuiz = document.getElementById('view-quiz');

  function switchTab(mode) {
    var isBrowse = mode === 'browse';
    viewBrowse.hidden = !isBrowse;
    viewQuiz.hidden = isBrowse;
    tabBrowse.classList.toggle('active', isBrowse);
    tabQuiz.classList.toggle('active', !isBrowse);
  }
  tabBrowse.addEventListener('click', function () { switchTab('browse'); });
  tabQuiz.addEventListener('click', function () { switchTab('quiz'); });

  // Division list is shared by the browse filter dropdown and the quiz setup checkboxes.
  var divisions = [];
  MEMBER_DATA.forEach(function (member) {
    var division = member.division || '(none)';
    if (divisions.indexOf(division) === -1) divisions.push(division);
  });

  function populateDivisionCheckboxes(container, divisionValues) {
    divisionValues.forEach(function (division) {
      var label = document.createElement('label');
      label.className = 'division-option';
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = division;
      checkbox.checked = true;
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + division));
      container.appendChild(label);
    });
  }

  function checkboxesIn(container) {
    return Array.prototype.slice.call(container.querySelectorAll('input[type=checkbox]'));
  }

  function wireSelectAll(selectAllEl, listEl) {
    selectAllEl.addEventListener('change', function () {
      checkboxesIn(listEl).forEach(function (cb) { cb.checked = selectAllEl.checked; });
    });
    listEl.addEventListener('change', function () {
      selectAllEl.checked = checkboxesIn(listEl).every(function (cb) { return cb.checked; });
    });
  }

  // ---------- Mode A: Browse ----------
  var browseWrap = document.getElementById('browse-wrap');
  var searchBox = document.getElementById('search-box');
  var browseDivisionToggle = document.getElementById('browse-division-toggle');
  var browseDivisionPanel = document.getElementById('browse-division-panel');
  var browseDivisionList = document.getElementById('browse-division-checkboxes');
  var browseSelectAll = document.getElementById('browse-select-all');
  var regions = [];

  populateDivisionCheckboxes(browseDivisionList, divisions);
  wireSelectAll(browseSelectAll, browseDivisionList);

  function buildRegions() {
    MEMBER_DATA.forEach(function (member) {
      var region = document.createElement('div');
      region.className = 'hover-region';
      region.style.left = (member.x / IMAGE_WIDTH * 100) + '%';
      region.style.top = (member.y / IMAGE_HEIGHT * 100) + '%';
      region.style.width = (member.w / IMAGE_WIDTH * 100) + '%';
      region.style.height = (member.h / IMAGE_HEIGHT * 100) + '%';

      var tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = member.name + (member.division ? ' — ' + member.division : '');
      region.appendChild(tag);

      region.dataset.name = member.name.toLowerCase();
      region.dataset.division = member.division || '(none)';
      browseWrap.appendChild(region);
      regions.push(region);
    });
  }

  function applyBrowseFilter() {
    var query = searchBox.value.trim().toLowerCase();
    var selectedDivisions = checkboxesIn(browseDivisionList)
      .filter(function (cb) { return cb.checked; })
      .map(function (cb) { return cb.value; });
    var allDivisionsSelected = selectedDivisions.length === divisions.length;

    regions.forEach(function (region) {
      if (!query && allDivisionsSelected) {
        region.classList.remove('highlighted', 'dimmed');
        return;
      }
      var nameMatch = !query || region.dataset.name.indexOf(query) !== -1;
      var divisionMatch = selectedDivisions.indexOf(region.dataset.division) !== -1;
      var match = nameMatch && divisionMatch;
      region.classList.toggle('highlighted', match);
      region.classList.toggle('dimmed', !match);
    });
  }

  searchBox.addEventListener('input', applyBrowseFilter);
  browseDivisionList.addEventListener('change', applyBrowseFilter);
  browseSelectAll.addEventListener('change', applyBrowseFilter);

  browseDivisionToggle.addEventListener('click', function () {
    browseDivisionPanel.hidden = !browseDivisionPanel.hidden;
  });
  document.addEventListener('click', function (event) {
    if (browseDivisionPanel.hidden) return;
    if (event.target === browseDivisionToggle || browseDivisionPanel.contains(event.target)) return;
    browseDivisionPanel.hidden = true;
  });

  // ---------- Mode B: Quiz ----------
  var divisionList = document.getElementById('division-checkboxes');
  var selectAll = document.getElementById('select-all');
  var startBtn = document.getElementById('start-quiz');
  var setupEl = document.getElementById('quiz-setup');
  var sessionEl = document.getElementById('quiz-session');
  var completeEl = document.getElementById('quiz-complete');
  var progressEl = document.getElementById('quiz-progress');
  var faceImg = document.getElementById('quiz-face-img');
  var faceCrop = document.getElementById('quiz-face-crop');
  var showAnswerBtn = document.getElementById('show-answer');
  var answerEl = document.getElementById('quiz-answer');
  var answerName = document.getElementById('answer-name');
  var answerDivision = document.getElementById('answer-division');
  var answerText = document.getElementById('answer-text');
  var rememberedBtn = document.getElementById('btn-remembered');
  var forgotBtn = document.getElementById('btn-forgot');
  var restartBtn = document.getElementById('restart-quiz');
  var shortcutsHelpBtn = document.getElementById('shortcuts-help-btn');
  var shortcutsModal = document.getElementById('shortcuts-modal');
  var closeShortcutsBtn = document.getElementById('close-shortcuts');

  populateDivisionCheckboxes(divisionList, divisions);
  wireSelectAll(selectAll, divisionList);

  function divisionCheckboxes() {
    return checkboxesIn(divisionList);
  }

  var pool = [];
  var current = null;

  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  // member.{x,y,w,h} is the detected head box, framed tight to hair/chin/ears,
  // for members found in the group photo ('in-photo'). Pad that out to a
  // standard portrait-style crop (headroom above, shoulders below) rather
  // than revealing just the bare head. Members shown via the bottom grid
  // ('bottom-grid'/'placeholder') are already their own full uploaded photo
  // (or a placeholder) fitted to a cell, not a tight face crop -- padding
  // those further would crop into neighboring grid cells, so show them as-is.
  var PORTRAIT_TOP_MARGIN = 0.20;
  var PORTRAIT_BOTTOM_MARGIN = 0.45;
  var PORTRAIT_SIDE_MARGIN = 0.30;

  function portraitCrop(member) {
    if (member.location !== 'in-photo') {
      return { x: member.x, y: member.y, w: member.w, h: member.h };
    }
    var top = Math.max(0, member.y - member.h * PORTRAIT_TOP_MARGIN);
    var bottom = Math.min(IMAGE_HEIGHT, member.y + member.h + member.h * PORTRAIT_BOTTOM_MARGIN);
    var left = Math.max(0, member.x - member.w * PORTRAIT_SIDE_MARGIN);
    var right = Math.min(IMAGE_WIDTH, member.x + member.w + member.w * PORTRAIT_SIDE_MARGIN);
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  // Members whose photoSource was set to "excel" during annotation carry
  // their own photoDataUrl instead: the shared composite image still shows
  // whatever was actually in the group photo at their box, so cropping into
  // it would show the wrong (or a to-be-avoided) picture. Shown as a plain
  // fitted image rather than a cropped window into the composite.
  function showFaceCrop(member) {
    if (member.useExcelPhoto && member.photoDataUrl) {
      faceImg.src = member.photoDataUrl;
      faceImg.style.position = 'static';
      faceImg.style.width = '100%';
      faceImg.style.height = 'auto';
      faceCrop.style.height = 'auto';
      return;
    }

    faceImg.src = compositeImageSrc;
    faceImg.style.position = 'absolute';
    var crop = portraitCrop(member);
    var containerW = faceCrop.clientWidth;
    var scale = containerW / crop.w;
    faceCrop.style.height = (crop.h * scale) + 'px';
    faceImg.style.width = (IMAGE_WIDTH * scale) + 'px';
    faceImg.style.height = (IMAGE_HEIGHT * scale) + 'px';
    faceImg.style.left = (-crop.x * scale) + 'px';
    faceImg.style.top = (-crop.y * scale) + 'px';
  }

  function nextQuestion() {
    if (pool.length === 0) {
      sessionEl.hidden = true;
      completeEl.hidden = false;
      return;
    }
    current = pool.shift();
    answerEl.hidden = true;
    showAnswerBtn.hidden = false;
    progressEl.textContent = 'Remaining: ' + (pool.length + 1);
    showFaceCrop(current);
  }

  startBtn.addEventListener('click', function () {
    var selected = divisionCheckboxes()
      .filter(function (cb) { return cb.checked; })
      .map(function (cb) { return cb.value; });
    pool = shuffle(
      MEMBER_DATA.filter(function (m) { return selected.indexOf(m.division || '(none)') !== -1; }).slice()
    );
    if (!pool.length) return;
    setupEl.hidden = true;
    completeEl.hidden = true;
    sessionEl.hidden = false;
    nextQuestion();
  });

  showAnswerBtn.addEventListener('click', function () {
    answerEl.hidden = false;
    showAnswerBtn.hidden = true;
    answerName.textContent = current.name;
    answerDivision.textContent = current.division;
    answerText.textContent = current.answerText;
  });

  rememberedBtn.addEventListener('click', function () {
    nextQuestion();
  });

  forgotBtn.addEventListener('click', function () {
    // Re-enter the pool shuffled in, but never as the very next question.
    var insertAt = pool.length <= 1 ? pool.length : 1 + Math.floor(Math.random() * pool.length);
    pool.splice(insertAt, 0, current);
    nextQuestion();
  });

  restartBtn.addEventListener('click', function () {
    completeEl.hidden = true;
    setupEl.hidden = false;
  });

  window.addEventListener('resize', function () {
    if (!sessionEl.hidden && current) showFaceCrop(current);
  });

  // ---------- Keyboard shortcuts ----------
  function openShortcuts() {
    shortcutsModal.hidden = false;
  }
  function closeShortcuts() {
    shortcutsModal.hidden = true;
  }
  shortcutsHelpBtn.addEventListener('click', openShortcuts);
  closeShortcutsBtn.addEventListener('click', closeShortcuts);
  shortcutsModal.addEventListener('click', function (event) {
    if (event.target === shortcutsModal) closeShortcuts();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === '?') {
      event.preventDefault();
      if (shortcutsModal.hidden) openShortcuts(); else closeShortcuts();
      return;
    }

    if (!shortcutsModal.hidden) {
      if (event.key === 'Escape') closeShortcuts();
      return;
    }

    if (event.key === 'Escape' && !browseDivisionPanel.hidden) {
      browseDivisionPanel.hidden = true;
      return;
    }

    // Don't hijack keys while the user is typing in the browse search box.
    if (document.activeElement === searchBox) return;

    if (viewQuiz.hidden || sessionEl.hidden) return;

    var answerShown = !answerEl.hidden;

    if (!answerShown) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        showAnswerBtn.click();
      }
      return;
    }

    if (event.key === '1' || event.key === 'ArrowLeft') {
      event.preventDefault();
      forgotBtn.click();
    } else if (event.key === '2' || event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault();
      rememberedBtn.click();
    }
  });

  // ---------- init ----------
  var compositeImageSrc = document.getElementById('composite-image').src;
  faceImg.src = compositeImageSrc;
  buildRegions();
  switchTab('browse');
})();
