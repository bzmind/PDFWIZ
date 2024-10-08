//########################################################################################
// To see all the events of the eventBus see this url:
// https://github.com/VadimDez/ng2-pdf-viewer/blob/master/src/app/utils/event-bus-utils.ts
//########################################################################################

import * as UI_MODULE from './reading-page.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/js/pdf.worker.min.js';

let allPages = 0;
let sidebarScale = 0.25;
let pdfDoc = null;
let pdfHash;
let scrollDelay = 200;

const eventBus = new pdfjsViewer.EventBus();
const pdfLinkService = new pdfjsViewer.PDFLinkService({
  eventBus,
  ignoreDestinationZoom: true
});
let pdfViewer = null;
let findController = null;

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

      setLastPdfTheme(pdfHash);
      document.querySelector('#all-pages').textContent = allPages;

      pdfViewer = new pdfjsViewer.PDFViewer({
        container: document.querySelector('.main-container'),
        eventBus,
        linkService: pdfLinkService
      });

      // Renders all the pages by itself, adds them to the DOM
      pdfViewer.setDocument(pdfDoc);

      // Set the document for PDFLinkService
      pdfLinkService.setViewer(pdfViewer);
      pdfLinkService.setDocument(pdfDoc);

      //########################################################################################
      // To see all the events of the eventBus see this url:
      // https://github.com/VadimDez/ng2-pdf-viewer/blob/master/src/app/utils/event-bus-utils.ts
      //########################################################################################
      // Listen for pagechanging event to update current page
      pdfViewer.eventBus.on('pagechanging', function (e)
      {
        document.querySelector('#currPage').value = e.pageNumber;
        UI_MODULE.checkButtons();
      });

      // Update total pages on pagesinit
      pdfViewer.eventBus.on('pagesinit', async function ()
      {
        loadOutline(pdfDoc, pdfLinkService);
        await loadThumbnails(pdfDoc);
      });

      // The 'documentload' event didn't work so I used 'pagesloaded' instead
      pdfViewer.eventBus.on('pagesloaded', function ()
      {
        getPdfLastData(pdfHash);
        UI_MODULE.handleAfterPDFLoaded();
      });

      // Initialize the FindController
      findController = new pdfjsViewer.PDFFindController({
        pdfViewer: pdfViewer,
        eventBus: eventBus,
        linkService: pdfLinkService
      });

      pdfViewer.findController = findController;

      // Event listeners for the Find feature
      let searchInput = document.querySelector('#search-input-container .search-input');
      searchInput.addEventListener('keyup', (e) =>
      {
        if ((e.key === 'Enter' || e.keyCode === 13) && searchInput.value.length != 0)
        {
          const query = searchInput.value;
          findController.executeCommand('find', {
            query: query,
            phraseSearch: true,
            caseSensitive: false,
            highlightAll: true,
          });
        }
      });

      document.querySelector('.searchButton').addEventListener('click', (e) =>
      {
        const query = searchInput.value;
        findController.executeCommand('find', {
          query: query,
          phraseSearch: true,
          caseSensitive: false,
          highlightAll: true,
        });
      });

      let prevSearchResult = document.querySelector('.prev-search-result');
      let nextSearchResult = document.querySelector('.next-search-result');

      prevSearchResult.addEventListener('click', function ()
      {
        if (searchInput.value)
        {
          findController.executeCommand('findagain', {
            query: findController.state.query,
            phraseSearch: true,
            findPrevious: true,
            caseSensitive: false,
            highlightAll: true,
          });
        }
      });

      nextSearchResult.addEventListener('click', function ()
      {
        if (searchInput.value)
        {
          findController.executeCommand('findagain', {
            query: findController.state.query,
            phraseSearch: true,
            findPrevious: false,
            caseSensitive: false,
            highlightAll: true,
          });
        }
      });
    });
  }

  fileReader.readAsArrayBuffer(file);
}

function loadOutline(pdfDocument, linkService)
{
  pdfDocument.getOutline().then(function (outline)
  {
    if (!outline)
      return;

    const outlineContainer = document.getElementById('outlineContainer');
    createOutlineItems(outline, outlineContainer, linkService);
  });
}

async function loadThumbnails(pdfDocument)
{
  const thumbnailsContainer = document.getElementById('thumbnailsContainer');
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++)
  {
    await pdfDocument.getPage(pageNum).then(async function (page)
    {
      const viewport = page.getViewport({ scale: sidebarScale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render the thumbnail
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise.then(function ()
      {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.setAttribute('class', 'thumbnail');
        thumbnailDiv.setAttribute('data-page-image', pageNum);

        const pageSpan = document.createElement('span');
        pageSpan.className = 'thumbnail-pageSpan';
        pageSpan.textContent = pageNum;

        thumbnailDiv.append(pageSpan);
        thumbnailDiv.appendChild(canvas);
        thumbnailsContainer.appendChild(thumbnailDiv);

        thumbnailDiv.addEventListener('click', function ()
        {
          pdfViewer.currentPageNumber = pageNum;
          UI_MODULE.checkButtons();
        });
      });
    });
  }
}

function createOutlineItems(items, container, linkService, level = 0)
{
  const ul = document.createElement('ul');
  ul.style.paddingLeft = `${level * 10}px`; // Indent based on the level

  if (level > 0)
    ul.style.display = 'none';

  container.appendChild(ul);

  items.forEach(async function (item)
  {
    let isDestNull = item.dest == null || item.dest[0] == null;
    let isURL = item.url != null;

    const titleContainer = document.createElement('div');
    titleContainer.className = "titleContainer";

    const li = document.createElement('li');
    li.className = 'outlineItem';

    let textElement = null;

    if (isURL)
    {
      textElement = document.createElement('a');
      textElement.href = item.url;
      textElement.target = '_blank';
    }
    else
      textElement = document.createElement('p');

    if (isDestNull == false)
    {
      const pageSpan = document.createElement('span');
      pageSpan.className = "pageSpan";
      pageSpan.textContent = await getDestinationPage(item.dest);
      textElement.appendChild(pageSpan);
    }
    textElement.appendChild(document.createTextNode(item.title));

    // If the item has children, add a toggle button
    if (item.items && item.items.length > 0)
    {
      const toggle = document.createElement('span');
      toggle.className = 'toggle';

      const icon = document.createElement('i');
      icon.classList.add('fa-solid', 'fa-chevron-down', 'rotate');

      toggle.appendChild(icon);
      titleContainer.appendChild(toggle);

      toggle.addEventListener('click', function (e)
      {
        e.target.closest('span').firstChild.classList.toggle('rotate');
        let ul = e.target.closest('span').parentElement.nextElementSibling;
        toggleCSSProperty(ul, 'display', 'none', '');
      });
    }

    if (item.items && item.items.length > 0)
    {
      titleContainer.appendChild(textElement);
      li.style.borderBottom = 'none';
      li.appendChild(titleContainer);
      ul.appendChild(li);
    } else
    {
      li.appendChild(textElement);
      ul.appendChild(li);
    }

    if (isDestNull == false)
    {
      // Navigate to the destination on click
      textElement.addEventListener('click', function ()
      {
        linkService.goToDestination(item.dest).then(() =>
        {
          UI_MODULE.checkButtons();
        });
      });
    }

    // Recursively create the sub-outline items
    if (item.items && item.items.length > 0)
    {
      createOutlineItems(item.items, li, linkService, level + 1);
    }
  });
}

async function getDestinationPage(dest)
{
  try
  {
    let destination = null;

    if (Array.isArray(dest))
      destination = dest;
    else
      destination = await pdfDoc.getDestination(dest);

    const [destRef, ...rest] = destination;
    const pageIndex = await pdfDoc.getPageIndex(destRef);
    return pageIndex + 1; // Page index is zero-based, so add 1
  } catch (error)
  {
  }
}

function toggleCSSProperty(element, property, value1, value2)
{
  // Get the current value of the property
  let currentValue = window.getComputedStyle(element).getPropertyValue(property);
  
  // Toggle between the two values
  if (currentValue.trim() === value1)
  {
    element.style[property] = value2;
  } else
  {
    element.style[property] = value1;
  }
}

function setLastPdfTheme(pdfHash)
{
  let pdf = localStorage.getItem(pdfHash);
  if (pdf != null)
  {
    let data = JSON.parse(localStorage.getItem(pdfHash));

    // Get pdf's last theme
    document.querySelector('.active-theme').setAttribute('class', 'disabled-theme');
    let theme = data.theme;
    document.getElementById(theme).setAttribute('class', 'active-theme');

    if (theme == 'dark')
      UI_MODULE.setDarkTheme();
    else
      UI_MODULE.setLightTheme();
  }
}

function getPdfLastData(pdfHash)
{
  let pdf = localStorage.getItem(pdfHash);
  if (pdf != null)
  {
    let data = JSON.parse(localStorage.getItem(pdfHash));

    // Get pdf's last scale
    let scale = parseFloat(data.scale);
    changeScale(scale);

    // Get pdf's last position
    let lastPos = parseInt(data.position);
    document.querySelector('.main-container').scrollTop = lastPos;

    // Get pdf's last theme
    document.querySelector('.active-theme').setAttribute('class', 'disabled-theme');
    let theme = data.theme;
    document.getElementById(theme).setAttribute('class', 'active-theme');

    if (theme == 'dark')
      UI_MODULE.setDarkTheme();
    else
      UI_MODULE.setLightTheme();
  } else
  {
    changeScale(1.2);
    UI_MODULE.updateLocalStorage();
  }
}

function changeScale(scale)
{
  document.querySelector('input[name="scaleRadio"]:checked').removeAttribute('checked');
  let currentScaleInput = document.querySelector(`input[value="${scale}"]`);

  if (!currentScaleInput)
    currentScaleInput = document.querySelector(`input[value="${1.2}"]`);

  currentScaleInput.checked = "checked";
  pdfViewer.currentScaleValue = currentScaleInput.value;
}

export
{
  allPages, pdfViewer, toggleCSSProperty, findController, pdfHash, scrollDelay
};
export default showPdf;