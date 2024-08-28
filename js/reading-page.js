import * as PDF_MODULE from './pdf-processor.js';

let checkButtons;
let updateLocalStorage;
let toggleTheme;
let setDarkTheme;
let setLightTheme;
let handleAfterPDFLoaded;

function setupReadingPageUI()
{
  console.log('=========================================================================================================');
  console.log('[reading-page.js] Line 15');
  console.log(PDF_MODULE.pdfHash === undefined ? 'pdfHash is undefined' : localStorage.getItem(PDF_MODULE.pdfHash));
  console.log('=========================================================================================================');

  let isScaleMenuOpen = false;
  let isSearchMenuOpen = false;
  let isPageInfoFocused = false;
  let prevPageNum;
  let sidebar = document.querySelector('#sidebar');
  let toolbar = document.querySelector('.toolbar');
  let pageInfo = document.querySelector('.page-info');
  let prevButton = document.querySelector('#prev-page');
  let nextButton = document.querySelector('#next-page');
  let pageCounter = document.querySelector('#currPage');
  let mainContainer = document.querySelector('.main-container');

  pageCounter.value = 1;

  window.onunload = () =>
  {
    console.log('=========================================================================================================');
    console.log('[reading-page.js] Line 32');
    console.log(PDF_MODULE.pdfHash === undefined ? 'pdfHash is undefined' : localStorage.getItem(PDF_MODULE.pdfHash));
    console.log('Updated local storage');
    updateLocalStorage();
    console.log(PDF_MODULE.pdfHash === undefined ? 'pdfHash is undefined' : localStorage.getItem(PDF_MODULE.pdfHash));
    console.log('=========================================================================================================');
  };

  // Save PDF data on tab change
  document.addEventListener('visibilitychange', function ()
  {
    if (document.hidden)
    {
      console.log('=========================================================================================================');
      console.log('[reading-page.js] Line 46');
      console.log(PDF_MODULE.pdfHash === undefined ? 'pdfHash is undefined' : localStorage.getItem(PDF_MODULE.pdfHash));
      console.log('Updated local storage');
      updateLocalStorage();
      console.log(PDF_MODULE.pdfHash === undefined ? 'pdfHash is undefined' : localStorage.getItem(PDF_MODULE.pdfHash));
      console.log('=========================================================================================================');
    }
  });

  // Button events
  prevButton.addEventListener('click', () =>
  {
    goToPrevPage();
  });
  nextButton.addEventListener('click', () =>
  {
    goTNextPage();
  });

  function goToPrevPage()
  {
    if (PDF_MODULE.pdfViewer.currentPageNumber - 1 == 0)
    {
      checkButtons();
      return;
    }
    PDF_MODULE.pdfViewer.currentPageNumber--;
    checkButtons();
  }


  function goTNextPage()
  {
    if (PDF_MODULE.pdfViewer.currentPageNumber + 1 > PDF_MODULE.allPages)
    {
      checkButtons();
      return;
    }
    PDF_MODULE.pdfViewer.currentPageNumber++;
    checkButtons();
  }

  const pdfInfo = {
    position: '',
    scale: '',
    theme: ''
  }

  checkButtons = function ()
  {
    if (pageCounter.value == 1)
      prevButton.disabled = true;
    else
      prevButton.disabled = false;

    if (pageCounter.value == PDF_MODULE.allPages)
      nextButton.disabled = true;
    else
      nextButton.disabled = false;
  }

  updateLocalStorage = function ()
  {
    pdfInfo.position = mainContainer.scrollTop;
    pdfInfo.scale = document.querySelector('input[name="scaleRadio"]:checked').value;
    pdfInfo.theme = document.querySelector('.active-theme').id;

    let strPdfInfo = JSON.stringify(pdfInfo);
    localStorage.setItem(PDF_MODULE.pdfHash, strPdfInfo);
  }

  handleAfterPDFLoaded = function ()
  {
    removeLoading();
    handleUIElementsVisibility();
    checkButtons();
  }

  let inToolbarArea = false;
  let inPageInfoArea = false;

  let toolbarArea = document.querySelector('.toolbar-area');
  let pageInfoArea = document.querySelector('.pageInfo-area');

  function handleUIElementsVisibility()
  {
    let startDelay = 5000;
    let transitionDuration = 1000;

    toolbar.style.transition = `opacity ${transitionDuration}ms linear`;
    pageInfo.style.transition = `opacity ${transitionDuration}ms linear`;
    
    setTimeout(() =>
    {
      toolbar.style.opacity = '0';
      pageInfo.style.opacity = '0';
      toolbar.style.pointerEvents = 'none';
      pageInfo.style.pointerEvents = 'none';
      
      document.addEventListener('mousemove', checkToolbarVisibility);
      document.addEventListener('mousemove', checkPageInfoVisibility);
      mainContainer.addEventListener('scroll', documentScrolled);

      setTimeout(() =>
      {
        transitionDuration = 100;
        toolbar.style.transition = `opacity ${transitionDuration}ms linear`;
        pageInfo.style.transition = `opacity ${transitionDuration}ms linear`;
      }, transitionDuration);
    }, startDelay)
  }

  function checkToolbarVisibility(e)
  {
    const toolbarAreaRect = toolbarArea.getBoundingClientRect();

    const isInToolbarArea = (
      e.clientX >= toolbarAreaRect.left &&
      e.clientX <= toolbarAreaRect.right &&
      e.clientY >= toolbarAreaRect.top &&
      e.clientY <= toolbarAreaRect.bottom
    );

    if (isInToolbarArea != inToolbarArea)
    {
      if (isInToolbarArea)
      {
        toolbar.style.opacity = '1';
        toolbar.style.pointerEvents = 'auto';
        inToolbarArea = true;
      } else
      {
        if (isScaleMenuOpen == false && isSearchMenuOpen == false)
        {
          toolbar.style.opacity = '0';
          toolbar.style.pointerEvents = 'none';
          inToolbarArea = false;
        }
      }
    }
  }

  function checkPageInfoVisibility(e)
  {
    const pageInfoAreaRect = pageInfoArea.getBoundingClientRect();

    const isInPageInfoArea = (
      e.clientX >= pageInfoAreaRect.left &&
      e.clientX <= pageInfoAreaRect.right &&
      e.clientY >= pageInfoAreaRect.top &&
      e.clientY <= pageInfoAreaRect.bottom
    );

    if (isInPageInfoArea != inPageInfoArea)
    {
      if (isInPageInfoArea)
      {
        pageInfo.style.opacity = '1';
        pageInfo.style.pointerEvents = 'auto';
        inPageInfoArea = true;
      } else
      {
        pageInfo.style.opacity = '0';
        pageInfo.style.pointerEvents = 'none';
        inPageInfoArea = false;
      }
    }
  }

  function removeLoading()
  {
    setTimeout(() =>
    {
      const loading = document.querySelector('.loading');
      if (loading)
      {
        loading.style.opacity = 0;
        setTimeout(() =>
        {
          loading.style.display = 'none';
        }, 300); // Take this value from _reader.scss line 547 transition's duration
      }
    }, PDF_MODULE.scrollDelay);
  }

  // Home button
  let homeButton = document.querySelector('#home-button');
  homeButton.addEventListener('click', goToHome);

  function goToHome()
  {
    location.reload();
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
      isScaleMenuOpen = false;
    } else
    {
      scaleButton.setAttribute('class', 'clicked');
      scaleMenu.setAttribute('class', 'on');
      isScaleMenuOpen = true;
    }
  }

  // The scale levels in the scale menu
  let scaleRadios = document.querySelectorAll('input[name="scaleRadio"]');
  scaleRadios.forEach((item) =>
  {
    item.addEventListener('change', changeScale);
  });

  function changeScale(e)
  {
    PDF_MODULE.pdfViewer.currentScaleValue = e.target.value;
  }

  // Toggle sidebar
  let sidebarButton = document.querySelector('#sidebar-button');
  sidebarButton.addEventListener('click', toggleSidebar);
  function toggleSidebar()
  {
    PDF_MODULE.toggleCSSProperty(sidebar, 'display', 'none', '');
  }

  // Setup sidebar buttons
  document.querySelectorAll("#sidebarButtons button").forEach((item) =>
  {
    item.addEventListener("click", toggleSidebarViewType);
  });

  function toggleSidebarViewType(e)
  {
    let thumbnailContainer = document.querySelector("#thumbnailsContainer");
    let outlineContainer = document.querySelector("#outlineContainer");
    let activeButton = document.querySelector(".active-sidebar");

    if (e.target.closest("button") == activeButton)
      return

    if (isElementVisible(thumbnailContainer))
    {
      thumbnailContainer.style.display = "none";
      outlineContainer.style.display = "";
      activeButton.className = "";
      document.querySelector("button#outline").className = "active-sidebar";
    }
    else if (isElementVisible(outlineContainer))
    {
      outlineContainer.style.display = "none";
      thumbnailContainer.style.display = "";
      activeButton.className = "";
      document.querySelector("button#thumbnails").className = "active-sidebar";
    }
  }

  function isElementVisible(element)
  {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
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
      isSearchMenuOpen = false;
    } else
    {
      searchMenu.setAttribute('class', 'on');
      searchButton.setAttribute('class', 'clicked');
      setTimeout(() =>
      {
        document.querySelector('.search-input').focus();
      }, 50);
      isSearchMenuOpen = true;
    }
  }

  // Toggle Theme
  toggleTheme = function ()
  {
    let activeTheme = document.querySelector('.active-theme');
    let disabledTheme = document.querySelector('.disabled-theme');

    activeTheme.removeAttribute('class');
    activeTheme.setAttribute('class', 'disabled-theme');

    disabledTheme.removeAttribute('class');
    disabledTheme.setAttribute('class', 'active-theme');

    document.querySelector('.pdf-container').classList.toggle('pdf-dark-theme');
    document.querySelector('#sidebar').classList.toggle('sidebar-dark-theme');
  }

  // Set dark theme
  setDarkTheme = function ()
  {
    let activeTheme = document.querySelector('.active-theme');
    let darkTheme = document.querySelector('#dark');

    activeTheme.removeAttribute('class');
    activeTheme.setAttribute('class', 'disabled-theme');

    darkTheme.removeAttribute('class');
    darkTheme.setAttribute('class', 'active-theme');

    document.querySelector('.pdf-container').classList.remove('pdf-dark-theme');
    document.querySelector('#sidebar').classList.remove('sidebar-dark-theme');

    document.querySelector('.pdf-container').classList.add('pdf-dark-theme');
    document.querySelector('#sidebar').classList.add('sidebar-dark-theme');
  }

  // Set light theme
  setLightTheme = function ()
  {
    let activeTheme = document.querySelector('.active-theme');
    let lightTheme = document.querySelector('#light');

    activeTheme.removeAttribute('class');
    activeTheme.setAttribute('class', 'disabled-theme');

    lightTheme.removeAttribute('class');
    lightTheme.setAttribute('class', 'active-theme');

    document.querySelector('.pdf-container').classList.remove('pdf-dark-theme');
    document.querySelector('#sidebar').classList.remove('sidebar-dark-theme');
  }

  let themeButton = document.querySelector('#theme-button');
  themeButton.addEventListener('click', toggleTheme);

  // Document click
  document.addEventListener('click', documentClicked);
  function documentClicked(e)
  {
    const isOutOfScale = e.target != scaleMenu && !scaleMenu.contains(e.target)
      && e.target != scaleButton && !scaleButton.contains(e.target);

    const isOutOfSearch = e.target != searchMenu && !searchMenu.contains(e.target)
      && e.target != searchButton && !searchButton.contains(e.target)
      && e.target != pageInfo && !pageInfo.contains(e.target);

    const isInsidePageInfo = e.target == pageInfo || pageInfo.contains(e.target);

    if (isInsidePageInfo)
      isPageInfoFocused = true;
    else
      isPageInfoFocused = false;

    if (isOutOfScale)
    {
      scaleMenu.removeAttribute('class');
      scaleButton.removeAttribute('class');
      isScaleMenuOpen = false;
    }

    if (isOutOfSearch)
    {
      searchMenu.removeAttribute('class');
      searchButton.removeAttribute('class');
      isSearchMenuOpen = false;

      // Reset the find controller state to remove highlights
      PDF_MODULE.findController.executeCommand('find', {
        query: '',           // Empty query to reset the search
        caseSensitive: false,
        phraseSearch: true,
        highlightAll: false
      });

      // Optionally, reset the findController state completely
      PDF_MODULE.findController.active = false;
    }
  }

  let scrollTimer = null;
  let savePdfDataTimer = null;
  function documentScrolled(e)
  {
    document.removeEventListener('mousemove', checkPageInfoVisibility);

    pageInfo.style.opacity = '1';
    pageInfo.style.pointerEvents = 'auto';
    inPageInfoArea = true;

    if (savePdfDataTimer !== null)
      clearTimeout(savePdfDataTimer);

    if (scrollTimer !== null)
      clearTimeout(scrollTimer);

    checkButtons();

    savePdfDataTimer = setTimeout(() =>
    {
      console.log('=========================================================================================================');
      console.log('[reading-page.js] Line 459');
      console.log(PDF_MODULE.pdfHash === undefined ? 'pdfHash is undefined' : localStorage.getItem(PDF_MODULE.pdfHash));
      console.log('Updated local storage');
      updateLocalStorage();
      console.log(PDF_MODULE.pdfHash === undefined ? 'pdfHash is undefined' : localStorage.getItem(PDF_MODULE.pdfHash));
      console.log('=========================================================================================================');
    }, 500);

    scrollTimer = setTimeout(function ()
    {
      document.addEventListener('mousemove', checkPageInfoVisibility);
      pageInfo.style.opacity = '0';
      pageInfo.style.pointerEvents = 'none';
      inPageInfoArea = false;
    }, 2000);
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

  // Control page counter input on blur and enter key press
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
        PDF_MODULE.pdfViewer.currentPageNumber = parseInt(e.target.value);
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
      PDF_MODULE.pdfViewer.currentPageNumber = parseInt(e.target.value);
      checkButtons();
    }
  });

  // Enable arrow keys for page counter
  pageCounter.addEventListener('keydown', (e) =>
  {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown')
    {
      e.preventDefault();
    }
  });

  pageCounter.addEventListener('wheel', (event) =>
  {
    event.preventDefault();
    if (event.deltaY < 0)
    {
      goToPrevPage();
    } else if (event.deltaY > 0)
    {
      goTNextPage();
    }
  });

  document.addEventListener('keydown', (e) =>
  {
    if (e.key === 'ArrowUp')
    {
      if (isPageInfoFocused)
      {
        goToPrevPage();
      }
    } else if (e.key === 'ArrowDown')
    {
      if (isPageInfoFocused)
      {
        goTNextPage();
      }
    }
  });

  if (document.querySelector('.temp') != null)
    document.querySelector('.temp').replaceWith(...document.querySelector('.temp').childNodes);
}

export { setupReadingPageUI, checkButtons, updateLocalStorage, toggleTheme, setDarkTheme, setLightTheme, handleAfterPDFLoaded };