import * as UI_MODULE from './reading-page.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/js/pdf.worker.min.js';

let allPages = 0;
let sidebarScale = 0.25;
let pdfDoc = null;
let pagesRefs = [];
let searchResultPageAndText = [];
let searchResultSpans = [];
let isSearching;
let pdfHash;
let oldPagesNums = [];

const eventBus = new pdfjsViewer.EventBus();
const pdfLinkService = new pdfjsViewer.PDFLinkService({ eventBus });

// Get document
function showPdf(file)
{
  let fileReader = new FileReader();

  fileReader.onload = function ()
  {
    let typedArray = new Uint8Array(this.result);

    pdfjsLib.getDocument(typedArray).promise.then(function (_pdfDoc)
    {
      pdfDoc = _pdfDoc;
      allPages = pdfDoc.numPages;
      pdfHash = pdfDoc.fingerprints[0];
      getPdfLastData(pdfHash);
      setupPageContainers();
      setupSidebar();
      setupPageRefs();
      document.querySelector('#all-pages').textContent = allPages;
    });
  }

  fileReader.readAsArrayBuffer(file);
}

function setupInternalLink(internalLink)
{
  internalLink.addEventListener('click', goToInternalLinkPage);
}

function goToInternalLinkPage(e)
{
  let pageNum = getPageNumFromDestHash(e.target.hash);
  let pageToScroll = document.querySelector(`[data-page="${pageNum}"]`);
  pageToScroll.scrollIntoView({ block: 'start' });
}

function getPageNumFromDestHash(destHash)
{
  const pattern = /[^{\}]+(?=})/g;
  let jsonDest = JSON.parse(`{${unescape(destHash).match(pattern)[0]}}`);
  let pageNum = pagesRefs[`${jsonDest.num}R`];
  return pageNum;
}

function setupPageRefs()
{
  for (let pageNum = 1; pageNum <= allPages; pageNum++)
  {
    pdfDoc.getPage(pageNum).then(page =>
    {
      const refStr = page.ref.gen === 0 ? `${page.ref.num}R` : `${page.ref.num}R${page.ref.gen}`;
      pagesRefs[refStr] = pageNum;
    });
  }
}

// Prepare the page containers
function setupPageContainers()
{
  document.querySelector('.pdf-container').innerHTML = "";

  let promise = pdfDoc.getPage(Math.floor(allPages / 2)).then(page =>
  {
    let scale = parseFloat(document.querySelector('input[name="scaleRadio"]:checked').value);
    let viewport = page.getViewport({ scale });

    for (let i = 1; i <= allPages; i++)
    {
      let pageContainer = document.createElement('div');
      pageContainer.setAttribute('class', 'page-container');
      pageContainer.setAttribute('data-page', i);
      pageContainer.id = `page${i}`;
      pageContainer.style.minHeight = `${viewport.height}px`;
      pageContainer.style.minWidth = `${viewport.width}px`;

      if (document.querySelector('.active-theme').id == 'dark')
        pageContainer.style.backgroundColor = 'black';
      else
        pageContainer.style.backgroundColor = 'white';

      document.querySelector('.pdf-container').appendChild(pageContainer);
    }
  });

  return promise.then(() =>
  {
    enableObserver();
    observePageChange();
    getPdfLastData(pdfDoc.fingerprints[0]);
  });
}

function getPdfLastData(pdfHash)
{
  let pdf = localStorage.getItem(pdfHash);
  if (pdf != null)
  {
    // Get pdf's last position
    let lastPos = parseInt(JSON.parse(localStorage.getItem(pdfHash)).position);
    document.querySelector('.pdf-container').scrollTop = lastPos;

    // Get pdf's last scale
    let zoom = parseFloat(JSON.parse(localStorage.getItem(pdfHash)).zoom);
    document.querySelector('input[name="scaleRadio"]:checked').removeAttribute('checked');
    document.querySelectorAll('input[name="scaleRadio"]').forEach(input =>
    {
      if (input.value == zoom)
      {
        input.checked = "checked";
      }
    });

    // Get pdf's last theme
    document.querySelector('.active-theme').setAttribute('class', 'disabled-theme');
    let theme = JSON.parse(localStorage.getItem(pdfHash)).theme;
    document.getElementById(theme).setAttribute('class', 'active-theme');
  } else
  {
    document.querySelector('input[name="scaleRadio"]:checked').removeAttribute('checked');
    document.querySelectorAll('input[name="scaleRadio"]').forEach(input =>
    {
      if (input.value == 1.2)
      {
        input.checked = "checked";
      }
    });
  }
}

// Render page
function renderPage(pageNum)
{
  if (document.querySelector(`[data-page="${pageNum}"] > #pdfLayer`) != null)
    return;

  return pdfDoc.getPage(pageNum).then(page =>
  {
    let scale = parseFloat(document.querySelector('input[name="scaleRadio"]:checked').value);

    let canvas = document.createElement('canvas');
    canvas.style.display = "block";
    canvas.id = "pdfLayer";

    if (document.querySelector('#dark').getAttribute('class') == 'active-theme')
      canvas.classList.add('pdf-layer-dark');
    else
      canvas.classList.add('pdfLayerLight');

    let ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({
      canvasContext: ctx,
      viewport
    });

    let pageContainer = document.querySelector(`[data-page="${pageNum}"]`);
    pageContainer.appendChild(canvas);
    pageContainer.setAttribute('data-visible', 'true');

    return page.getTextContent().then(textContent =>
    {
      let textLayer = document.createElement('div');
      textLayer.classList.add('textLayer');
      textLayer.style.left = `${canvas.offsetLeft}px`;
      textLayer.style.top = `${canvas.offsetTop}px`;
      textLayer.style.height = `${canvas.offsetHeight}px`;
      textLayer.style.width = `${canvas.offsetWidth}px`;

      pdfjsLib.renderTextLayer({
        textContent: textContent,
        container: textLayer,
        viewport: viewport,
        textDivs: []
      });

      document.querySelector(`[data-page="${pageNum}"]`).appendChild(textLayer);

      return page.getAnnotations().then((annotationData) =>
      {
        // We add annotations to the same layer as text layer, so that
        // our links are actuall links and the texts are also selectable
        // otherwise it was causing the texts to be unselectable
        let textLayer = document.querySelector(`[data-page="${pageNum}"] .textLayer`);

        pdfjsLib.AnnotationLayer.render({
          annotations: annotationData,
          div: textLayer,
          viewport: viewport.clone({ dontFlip: true }),
          page: page,
          linkService: pdfLinkService,
          enableScripting: true,
          renderInteractiveForms: true
        });

        let internalLinks = document.querySelectorAll(`[data-page="${pageNum}"] .textLayer a.internalLink`);
        internalLinks.forEach(item =>
        {
          setupInternalLink(item);
        });
        oldPagesNums.push(pageNum);
        removeOldRenderedPages();
      });
    });
  });
}

let pdfContainer = document.querySelector('.pdf-container');

pdfContainer.addEventListener('scroll', observePageChange);

let pageCounter = document.querySelector('#currPage');

function observePageChange()
{
  let height = pdfContainer.scrollHeight;
  let currPage = (pdfContainer.scrollTop / height * (allPages) + 1);
  pageCounter.value = Math.round(currPage);
  UI_MODULE.checkButtons();
}

// Enable Intersection Observer to lazy load pages
function enableObserver()
{
  function isVisible(entry)
  {
    entry.forEach((container) =>
    {
      if (container.isIntersecting)
      {
        let pageNum = parseInt(container.target.getAttribute('data-page'));
        if (!container.target.hasAttribute('data-visible'))
        {
          container.target.setAttribute('data-visible', 'true');
          if (isSearching)
          {
            renderPage(pageNum).then(() =>
            {
              let searchWordsArr = searchResultPageAndText[`${pageNum}R`];
              if (searchWordsArr != null)
                highlightSearchText(pageNum, searchWordsArr, false);
            });
          } else
          {
            renderPage(pageNum);
          }
        } else if (document.querySelector(`[data-page="${pageNum}"] .textLayer span.highlighted-search-result`) == null)
        {
          if (isSearching)
          {
            let searchWordsArr = searchResultPageAndText[`${pageNum}R`];
            if (searchWordsArr != null)
              highlightSearchText(pageNum, searchWordsArr, false);
          }
        }
      }
    });
  }

  let observer = new IntersectionObserver(isVisible, { threshold: 0 });
  let pageContainers = document.querySelectorAll('.page-container');
  pageContainers.forEach((container) =>
  {
    observer.observe(container);
  });
}

function removeOldRenderedPages()
{
  if (oldPagesNums.length > 10)
  {
    let latestRenderedPageNum = oldPagesNums.at(-1);
    let biggestDifference = 0;
    let farestPageToDelete;

    oldPagesNums.forEach(oldPageNum =>
    {
      let difference = Math.abs(latestRenderedPageNum - oldPageNum);
      if (difference > biggestDifference)
      {
        biggestDifference = difference;
        farestPageToDelete = document.querySelector(`[data-page="${oldPageNum}"]`);
      }
    });

    farestPageToDelete.removeAttribute('data-visible');
    farestPageToDelete.innerHTML = '';
    let index = oldPagesNums.indexOf(parseInt(farestPageToDelete.getAttribute('data-page')));
    oldPagesNums.splice(index, 1);
  }
}

// Setup sidebar
function setupSidebar()
{
  let promise = pdfDoc.getPage(Math.floor(allPages / 2)).then(page =>
  {

    let viewport = page.getViewport({ scale: sidebarScale });

    for (let i = 1; i <= allPages; i++)
    {
      let pageImageContainer = document.createElement('div');
      pageImageContainer.setAttribute('class', 'page-image-container');
      pageImageContainer.setAttribute('data-page-image', i);
      pageImageContainer.style.minHeight = `${viewport.height}px`;
      pageImageContainer.style.minWidth = `${viewport.width}px`;

      if (document.querySelector('.active-theme').id == 'dark')
        pageImageContainer.style.backgroundColor = 'black';
      else
        pageImageContainer.style.backgroundColor = 'white';

      document.querySelector('.sidebar').appendChild(pageImageContainer);
    }
  })
  return promise.then(() =>
  {
    enableSidebarObserver();
  });
}

function enableSidebarObserver()
{
  function isVisible(entry)
  {
    entry.forEach((imgContainer) =>
    {
      if (imgContainer.isIntersecting && !imgContainer.target.hasAttribute('data-visible'))
      {
        imgContainer.target.setAttribute('data-visible', 'true');
        let pageImageNum = parseInt(imgContainer.target.getAttribute('data-page-image'));
        renderPageImage(pageImageNum);
      }
    });
  }

  let observer = new IntersectionObserver(isVisible, { root: document.querySelector('.sidebar'), threshold: 0 });
  let pageImageContainers = document.querySelectorAll('.page-image-container');

  pageImageContainers.forEach((imgContainer) =>
  {
    observer.observe(imgContainer);
  });
}

function renderPageImage(pageImageNum)
{
  pdfDoc.getPage(pageImageNum).then(page =>
  {

    let canvas = document.createElement('canvas');
    canvas.style.display = "block";
    canvas.id = "pdfImageLayer";

    let ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: sidebarScale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({
      canvasContext: ctx,
      viewport
    }).promise.then(() =>
    {

      let aTag = document.createElement('a');
      aTag.href = `#page${pageImageNum}`;

      let img = document.createElement('img');
      img.src = canvas.toDataURL('image/jpeg');
      img.id = 'pdfPageImage';

      let theme = document.querySelector('.active-theme').id;
      if (theme == 'dark')
      {
        img.setAttribute('class', 'dark-image');
      }

      let pageNumberSpan = document.createElement('span');
      pageNumberSpan.textContent = pageImageNum;

      aTag.appendChild(img);
      aTag.appendChild(pageNumberSpan);

      let pageImageContainer = document.querySelector(`[data-page-image="${pageImageNum}"]`);
      pageImageContainer.appendChild(aTag);
    });
  });
}

function regexEscape(str)
{
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

let currentSearchResult;

function searchAllPages(searchText)
{
  clearPreviousSearchResults();
  UI_MODULE.checkSearchButtons();
  let promises = [];
  isSearching = true;

  for (let i = 1; i <= allPages; i++)
  {
    promises.push(getPageLinesPairs(searchText, i));
  }

  Promise.all(promises).then(results =>
  {
    for (let i = 0; i < results.length; i++)
    {
      if (results[i].lines.length > 0)
      {
        searchResultPageAndText[results[i].page + 'R'] = results[i].lines;
      }
    }
    let firstItemKey = Object.keys(searchResultPageAndText)[0];
    let pageNum;
    if (firstItemKey != null)
      pageNum = parseInt(firstItemKey.replace('R', ''));

    if (searchResultPageAndText[firstItemKey] != null)
      goToSearchResultPage(pageNum);
  });
}

function getPageLinesPairs(searchText, pageNum)
{
  return pdfDoc.getPage(pageNum).then(page =>
  {
    return page.getTextContent();
  }).then(textContent =>
  {
    // Search combined text content using regular expression
    let text = textContent.items.map(function (i) { return i.str; }).join(' ');
    let re = new RegExp(regexEscape(searchText), "gi");
    let m;
    let lines = [];

    while (m = re.exec(text))
    {
      let line = m[0];
      lines.push(line);
    }

    lines = lines.filter((value, index, self) =>
    {
      return self.indexOf(value) === index;
    });

    return { page: pageNum, lines: lines };
  });
}

function goToSearchResultPage(pageNum)
{
  let pageTextLayer = document.querySelector(`[data-page="${pageNum}"] .textLayer`);

  // We check if a highlighted span already exists, which means that the user
  // has already seen this page and this page is arleady rendered and it was
  // already showing the highlighted span, so if it has been seen before, we don't
  // repeat the rendering and highlighting process again
  let highlightedSpan = document.querySelectorAll(`[data-page="${pageNum}"] .textLayer span.highlighted-search-result`);

  if (highlightedSpan.length > 0)
  {
    let page = document.querySelector(`[data-page="${pageNum}"]`);
    page.setAttribute('data-searched', 'true');
    UI_MODULE.checkSearchButtons();
    highlightedSpan[0].scrollIntoView({ block: 'center' });
  } else
  {
    if (pageTextLayer == undefined)
    {
      renderPage(pageNum).then(() =>
      {
        let searchWordsArr = searchResultPageAndText[`${pageNum}R`];
        if (searchWordsArr != null)
          highlightSearchText(pageNum, searchWordsArr, true);
      });
    } else
    {
      let searchWordsArr = searchResultPageAndText[`${pageNum}R`];
      if (searchWordsArr != null)
        highlightSearchText(pageNum, searchWordsArr, true);
    }
  }
}

function highlightSearchText(pageNum, searchWordsArr, scroll)
{
  if (document.querySelector('[data-searched="true"]') != null)
    document.querySelector('[data-searched="true"]').removeAttribute('data-searched');

  let page = document.querySelector(`[data-page="${pageNum}"]`);
  page.setAttribute('data-searched', 'true');
  let firstHighlightedSpan;
  let pageSpans = document.querySelectorAll(`[data-page="${pageNum}"] .textLayer span`);

  searchWordsArr.forEach((searchWord) =>
  {
    let re = new RegExp(`${regexEscape(searchWord)}`, 'g');

    pageSpans.forEach(span =>
    {
      let spanContent = span.textContent;

      if (spanContent.includes(searchWord))
      {
        if (firstHighlightedSpan == undefined)
        {
          firstHighlightedSpan = span;
        }
        if (span.innerHTML.includes('highlighted-search-result'))
        {
          // This regex is only for grabbing the text outside of the span tag, so we can
          // highlight both the big "D" and the small "d" together
          let re = new RegExp(`(${regexEscape(searchWord)})(?![^<]*>|[^<>]*</)`, 'g');
          span.innerHTML = span.innerHTML.replace(re, `<span class="highlighted-search-result">${searchWord}</span>`);
        } else
        {
          span.innerHTML = span.innerHTML.replace(re, `<span class="highlighted-search-result">${searchWord}</span>`);
        }
      }
    });
  });

  let searchIndex = searchResultSpans.length;

  pageSpans.forEach(span =>
  {
    let spanContent = span.textContent;
    // Just to fill the searchResultSpans in order of the actuall spans in the page
    // that's why I made this case insensitive regex, otherwise the above re,
    // would first push all the spans which have big 'D' for example, and then
    // it would push all the spans which had small 'd'
    let insensitiveRe = new RegExp(regexEscape(searchWordsArr[0]), 'gi');
    if (insensitiveRe.test(spanContent))
    {
      if (span.className != 'highlighted-search-result' && !searchResultSpans.includes(span))
      {
        span.setAttribute('data-search-index', searchIndex);
        searchResultSpans.push(span);
        searchIndex++;
      }
    }
  });

  if (scroll)
  {
    currentSearchResult = firstHighlightedSpan;
    firstHighlightedSpan.scrollIntoView({ block: 'center' });
  }

  UI_MODULE.checkSearchButtons();
}

function scrollToSearchResultPage(e)
{
  let searchedPageNum = parseInt(document.querySelector('[data-searched="true"]').getAttribute('data-page'));
  let keys = Object.keys(searchResultPageAndText);
  let pageIndex;

  if (e.target.classList.contains('prev-search-result'))
    pageIndex = keys.indexOf(`${searchedPageNum}R`) - 1;
  else if (e.target.classList.contains('next-search-result'))
  {
    if (keys.indexOf(`${searchedPageNum}R`) == -1)
    {
      pageIndex = 1;
    } else
    {
      pageIndex = keys.indexOf(`${searchedPageNum}R`) + 1;
    }
  }

  let pageNum;

  if (pageIndex < 0 || pageIndex == keys.length)
    return;
  else
    pageNum = parseInt(keys[pageIndex].replace('R', ''));

  goToSearchResultPage(pageNum);
  UI_MODULE.checkSearchButtons();
}

function scrollToSearchResultSpan(e)
{
  let searchedSpan = parseInt(currentSearchResult.getAttribute('data-search-index'));
  let spanIndex;

  if (e.target.classList.contains('prev-search-result'))
    spanIndex = searchedSpan - 1;
  else if (e.target.classList.contains('next-search-result'))
    spanIndex = searchedSpan + 1;

  if (spanIndex < 0 || spanIndex == searchResultSpans.length)
  {
    currentSearchResult = null;
    scrollToSearchResultPage(e);
  } else
  {
    currentSearchResult = null;
    let spanToScroll = document.querySelector(`[data-search-index="${spanIndex}"]`);
    currentSearchResult = spanToScroll;
    spanToScroll.scrollIntoView({ block: 'center' });
  }

  UI_MODULE.checkSearchButtons();
}

function clearPreviousSearchResults()
{
  // If user was searching something else before this, and then it searched for sth else
  // then we need to clear any of the informations from the previous searched text
  // like currentSearchResult, data-search-index, and the page data-searched attribute
  currentSearchResult = null;
  isSearching = false;
  for (let i = 0; i < searchResultSpans.length; i++)
  {
    let span = document.querySelector(`[data-search-index="${i}"]`);
    if (span != null)
      span.removeAttribute('data-search-index');
  }

  if (document.querySelector('[data-searched="true"]') != null)
    document.querySelector('[data-searched="true"]').removeAttribute('data-searched');

  // empty the searchResultSpans from previous searched spans
  searchResultSpans = [];
  searchResultPageAndText = [];

  // The reason I'm getting the prevHighlight is that, if a parent span has two .highlighted-search-result in it's childern
  // then when I reach the first .highlighted-search-result from those two, then in that first loop, I'm cleaning it's parent's textContent
  // from ANY .highlighted-search-result spans, so then that second .highlighted-search-result is gone, it was there at our querySelectorAll query
  // but if there's two or more, we don't need them, we only need one .highlighted-search-result within a parent span, so then we will remove
  // any .highlighted-search-result from it, so when that second .highlighted-search-result is removed, it's no longer there, but it is still in our
  // highlights variable, so it'll return null and throws error, but I check if the second .highlighted-search-result has the same as the prevHighlight
  // it means that it's the second child of it's parent, we don't need it, so we return out of the forEach loop below
  let highlights = document.querySelectorAll('.highlighted-search-result');
  let prevHighlight;

  highlights.forEach((highlight) =>
  {
    if (prevHighlight != null && prevHighlight.parentElement == highlight.parentElement)
      return;

    highlight.parentElement.textContent = highlight.parentElement.textContent.replace('<span class="highlighted-search-result">', '').replace('</span>', '');
    prevHighlight = highlight;
  });
}

export
{
  allPages, setupPageContainers, setupSidebar, searchAllPages, currentSearchResult, searchResultSpans,
  searchResultPageAndText, clearPreviousSearchResults, goToSearchResultPage, scrollToSearchResultSpan, pdfHash
};
export default showPdf;