import * as PDF_MODULE from './pdf-processor.js';

let checkSearchButtons;
let checkButtons;
let updateSidebarPage;
let updateLocalStorage;

function enableReadingPageUI()
{
  let prevPageNum;
  let sidebar = document.querySelector('.sidebar');
  let pageInfo = document.querySelector('.page-info');
  let prevButton = document.querySelector('#prev-page');
  let nextButton = document.querySelector('#next-page');
  let pageCounter = document.querySelector('#currPage');
  let pdfContainer = document.querySelector('.pdf-container');
  let sidebarParent = document.querySelector('.sidebar-parent');

  pageCounter.value = 1;

  if (sidebar.classList.contains('sidebar-on'))
    sidebarParent.style.display = 'flex';
  else
    sidebarParent.style.display = 'none';

  window.onunload = () =>
  {
    updateLocalStorage();
  };

  // Button events
  prevButton.addEventListener('click', showPrevPage);
  nextButton.addEventListener('click', showNextPage);

  const pdfInfo = {
    position: '',
    zoom: '',
    theme: ''
  }

  checkButtons = function ()
  {
    if (pageCounter.value == 1)
    {
      prevButton.disabled = true;
    } else
    {
      prevButton.disabled = false;
    }

    if (pageCounter.value == PDF_MODULE.allPages)
    {
      nextButton.disabled = true;
    } else
    {
      nextButton.disabled = false;
    }
  }

  updateSidebarPage = function (pageNum)
  {
    let sidebarTarget = document.querySelector(`[data-page-image="${pageNum}"]`);
    sidebarTarget.scrollIntoView({ block: 'start' });
  }

  checkButtons();

  updateLocalStorage = function ()
  {
    pdfInfo.position = pdfContainer.scrollTop;
    pdfInfo.zoom = document.querySelector('input[name="scaleRadio"]:checked').value;
    pdfInfo.theme = document.querySelector('.active-theme').id;

    let strPdfInfo = JSON.stringify(pdfInfo);
    localStorage.setItem(PDF_MODULE.pdfHash, strPdfInfo);
  }

  function showPrevPage()
  {
    let currPage = parseInt(pageCounter.value);
    goToPage(currPage - 1);
  }

  function showNextPage()
  {
    let currPage = parseInt(pageCounter.value);
    goToPage(currPage + 1);
  }

  function goToPage(page)
  {
    let target = document.querySelector(`[data-page="${page}"]`);
    if (target != null)
      target.scrollIntoView({ block: 'start' });
    else
      document.querySelector(`[data-page="${prevPageNum}"]`).scrollIntoView({ block: 'start' });
  }

  // Scale button & menu
  let scaleButton = document.querySelector('#scale-button');
  let scaleMenu = document.querySelector('#scale-menu');

  scaleButton.addEventListener('click', toggleScaleMenu);

  function toggleScaleMenu()
  {

    if (scaleButton.getAttribute('class') == 'clicked')
    {
      scaleButton.removeAttribute('class');
      scaleMenu.removeAttribute('class');
    } else
    {
      scaleButton.setAttribute('class', 'clicked');
      scaleMenu.setAttribute('class', 'on');
    }
  }

  // The scale levels in the scale menu
  let scaleRadios = document.querySelectorAll('input[name="scaleRadio"]');
  scaleRadios.forEach((item) =>
  {
    item.addEventListener('change', zoom);
  });
  function zoom()
  {
    let lastPdfHeight = pdfContainer.scrollHeight;
    updateLocalStorage();

    PDF_MODULE.setupPageContainers().then(() =>
    {
      let ratio = pdfContainer.scrollHeight / lastPdfHeight;
      let newScrollPosition = pdfContainer.scrollTop * ratio;
      pdfContainer.scrollTop = newScrollPosition;
    });
  }

  // Search button
  let searchButton = document.querySelector('#search-button');
  let searchMenu = document.querySelector('#search-input-container');

  searchButton.addEventListener('click', toggleSearchMenu);

  function toggleSearchMenu()
  {
    if (searchButton.getAttribute('class') == 'clicked')
    {
      searchButton.removeAttribute('class');
      searchMenu.removeAttribute('class');
      searchInput.value = '';
      PDF_MODULE.clearPreviousSearchResults();
    } else
    {
      searchMenu.setAttribute('class', 'on');
      searchButton.setAttribute('class', 'clicked');
      document.querySelector('.prev-search-result').disabled = true;
      document.querySelector('.next-search-result').disabled = true;
      setTimeout(() =>
      {
        document.querySelector('.search-input').focus();
      }, 50);
    }
  }

  // Search Input
  let searchInput = document.querySelector('#search-input-container .search-input');
  searchInput.addEventListener('keyup', (e) =>
  {
    if ((e.key === 'Enter' || e.keyCode === 13) && searchInput.value.length != 0)
    {
      PDF_MODULE.searchAllPages(searchInput.value);
    }
  });

  let prevSearchResult = document.querySelector('.prev-search-result');
  let nextSearchResult = document.querySelector('.next-search-result');

  prevSearchResult.addEventListener('click', goToSearchResultSpan);
  nextSearchResult.addEventListener('click', goToSearchResultSpan);

  function goToSearchResultSpan(e)
  {
    PDF_MODULE.scrollToSearchResultSpan(e);
  }

  checkSearchButtons = function checkSearchButtons()
  {
    let prevSearchResultButton = document.querySelector('.prev-search-result');
    let nextSearchResultButton = document.querySelector('.next-search-result');
    let searchInput = document.querySelector('.search-input');
    let currentSpanIndex;

    if (PDF_MODULE.currentSearchResult != null)
      currentSpanIndex = parseInt(PDF_MODULE.currentSearchResult.getAttribute('data-search-index'));
    else
      currentSpanIndex = 0;

    let keys = Object.keys(PDF_MODULE.searchResultPageAndText);

    if (searchInput.value == '')
    {
      prevSearchResultButton.disabled = true;
      nextSearchResultButton.disabled = true;
    }

    if (currentSpanIndex == 0)
    {
      prevSearchResultButton.disabled = true;
    } else
    {
      prevSearchResultButton.disabled = false;
    }

    if (keys.length > 0)
    {
      if (currentSpanIndex == keys.length - 1)
      {
        nextSearchResultButton.disabled = true;
      } else
      {
        nextSearchResultButton.disabled = false;
      }
    } else
    {
      nextSearchResultButton.disabled = true;
    }
  }

  // Toggle Theme
  let themeButton = document.querySelector('#theme-button');
  themeButton.addEventListener('click', toggleTheme);

  function toggleTheme()
  {
    let activeTheme = document.querySelector('.active-theme');
    let disabledTheme = document.querySelector('.disabled-theme');

    activeTheme.removeAttribute('class');
    activeTheme.setAttribute('class', 'disabled-theme');

    disabledTheme.removeAttribute('class');
    disabledTheme.setAttribute('class', 'active-theme');

    document.querySelectorAll('#pdfLayer').forEach((item) =>
    {
      item.classList.toggle('pdf-layer-dark');
    });

    document.querySelectorAll('#pdfPageImage').forEach((itme) =>
    {
      itme.classList.toggle('dark-image');
    });

    document.querySelectorAll('.page-container').forEach((item) =>
    {
      if (item.style.backgroundColor == 'black')
        item.style.backgroundColor = 'white';
      else
        item.style.backgroundColor = 'black';
    });

    document.querySelectorAll('.page-image-container').forEach((item) =>
    {
      if (item.style.backgroundColor == 'black')
        item.style.backgroundColor = 'white';
      else
        item.style.backgroundColor = 'black';
    });

    updateLocalStorage();
  }

  // Document click
  document.addEventListener('click', documentClicked);
  function documentClicked(e)
  {
    if (e.target != scaleMenu && !scaleMenu.contains(e.target)
      && e.target != scaleButton && !scaleButton.contains(e.target))
    {
      scaleMenu.removeAttribute('class');
      scaleButton.removeAttribute('class');
    }

    if (e.target != searchMenu && !searchMenu.contains(e.target)
      && e.target != searchButton && !searchButton.contains(e.target)
      && e.target != pageInfo && !pageInfo.contains(e.target)
      && searchMenu.className == 'on')
    {
      searchMenu.removeAttribute('class');
      searchButton.removeAttribute('class');
      searchInput.value = '';
      PDF_MODULE.clearPreviousSearchResults();
    }
  }

  // Setup CTRL + F shortcut for search input
  // First disable CTRL + F of chrome
  window.addEventListener("keydown", function (e)
  {
    if (e.ctrlKey && e.key === 'f' || e.code == 'KeyF')
    {
      e.preventDefault();
    }
  });

  window.onkeyup = (e) =>
  {
    if (e.ctrlKey && e.key == 'f' || e.code == 'KeyF')
    {
      toggleSearchMenu();
    }
  }

  // Toggle pdf sidebar
  let sidebarButton = document.querySelector('#sidebar-button');
  sidebarButton.addEventListener('click', toggleSidebar);
  function toggleSidebar()
  {
    if (sidebar.classList.contains('sidebar-off'))
    {
      sidebarParent.style.display = 'flex';
      sidebar.classList.replace('sidebar-off', 'sidebar-on');
      pdfContainer.style.alignItems = 'flex-start';

    } else if (sidebar.classList.contains('sidebar-on'))
    {
      sidebarParent.style.display = 'none';
      pdfContainer.style.alignItems = 'center';
      sidebar.classList.replace('sidebar-on', 'sidebar-off');
    }

    updateSidebarPage(pageCounter.value);
  }

  // Controll page counter input on blur and enter key press
  pageCounter.addEventListener('focus', (e) =>
  {
    prevPageNum = e.target.value;
  });

  pageCounter.addEventListener('keyup', (e) =>
  {
    if (e.key === 'Enter' || e.keyCode === 13)
    {
      if (e.target.value > PDF_MODULE.allPages || e.target.value < 1)
      {
        e.target.value = (prevPageNum == undefined ? 1 : prevPageNum);
      } else if (e.target.value != prevPageNum)
      {
        goToPage(e.target.value);
        prevPageNum = e.target.value;
      }
    }
  });

  pageCounter.addEventListener('blur', (e) =>
  {
    if (e.target.value > PDF_MODULE.allPages || e.target.value < 1)
    {
      e.target.value = (prevPageNum == undefined ? 1 : prevPageNum);
    } else if (e.target.value != prevPageNum)
    {
      goToPage(e.target.value);
    }
  });

  if (document.querySelector('.temp') != null)
    document.querySelector('.temp').replaceWith(...document.querySelector('.temp').childNodes);
}

export { enableReadingPageUI, checkSearchButtons, checkButtons, updateSidebarPage, updateLocalStorage };