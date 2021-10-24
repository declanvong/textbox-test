const inputEl = document.querySelector('#input');
const outputEl = document.querySelector('#output');
const underlays = document.querySelector('#underlays');
const overlays = document.querySelector('#overlays');

const fontSize = 32;
outputEl.style.fontSize = `${fontSize}px`;

let textNode;
let compositionNode;

let isComposing = false;
let justFinishedComposition = false;
let composingText = '';
let text = 'Hello world';
let cursor = {
  index: 3,
  length: 0,
};

function renderText() {
  clearElement(output);
  textNode = undefined;

  if (isComposing) {
    // Split the text up into three chunks (before, within, and after the composition text)
    const pre = text.substr(0, cursor.index);
    const post = text.substr(cursor.index);
    const preNode = document.createTextNode(pre);
    const postNode = document.createTextNode(post);
    compositionNode = document.createElement('span');
    compositionNode.classList.add('composing');
    compositionNode.textContent = composingText;
    output.appendChild(preNode);
    output.appendChild(compositionNode);
    output.appendChild(postNode);
  } else {
    textNode = document.createTextNode(text);
    output.appendChild(textNode);
  }
}

// TODO: support multiline / wrapped text
function renderCursor() {
  clearElement(overlays);
  clearElement(underlays);
  let useLineCursor = cursor.length === 0 || isComposing;
  let rect;
  let origin = output.getBoundingClientRect();
  if (isComposing) {
    // When in composition mode, the cursor is always at the end of the composing text.
    rect = compositionNode.getBoundingClientRect();
  } else {
    const range = document.createRange();
    range.setStart(textNode, cursor.index);
    range.setEnd(textNode, cursor.index + cursor.length);
    rect = range.getBoundingClientRect();
  }

  if (useLineCursor) {
    cursorEl = document.createElement('span');
    cursorEl.classList.add('lineCursor');
    if (rect.height === 0) {
      cursorEl.style.left = '0px';
      cursorEl.style.height = `${fontSize}px`;
      cursorEl.style.top = '0px';
    } else {
      cursorEl.style.left = `${rect.right - origin.left}px`;
      cursorEl.style.height = `${rect.height}px`;
      cursorEl.style.top = `${rect.top - origin.top}px`;
    }
    overlays.appendChild(cursorEl);
  } else {
    const selectionUnderlayEl = document.createElement('div');
    selectionUnderlayEl.classList.add('selectionOverlay');
    selectionUnderlayEl.style.width = `${rect.width}px`;
    selectionUnderlayEl.style.left = `${rect.left - origin.left}px`;
    selectionUnderlayEl.style.height = `${rect.height}px`;
    selectionUnderlayEl.style.top = `${rect.top - origin.top}px`;
    underlays.appendChild(selectionUnderlayEl);
  }
}

function clearElement(el) {
  while (el.lastChild) {
    el.lastChild.remove();
  }
}

document.addEventListener('selectionchange', () => {
  const selection = document.getSelection();
  const range = selection.getRangeAt(0);
  if (range.startContainer === textNode) {
    cursor.index = range.startOffset;
    cursor.length = range.endOffset - range.startOffset;
    renderCursor();
  }
});

output.addEventListener('mousedown', e => {
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
    if (!pos) {
      return;
    }
    cursor.index = pos.offset;
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    cursor.index = range.startOffset;
  } else {
    return;
  }
  cursor.length = 0;
  renderCursor();
});
output.addEventListener('mouseup', () => {
  inputEl.focus();
})

let ctrlDown = false;
inputEl.addEventListener('keydown', e => {
  if (e.code === 'ControlLeft') {
    ctrlDown = true;
  } else if (!isComposing) {
    if (e.code === 'Backspace') {
      let after = text.substr(cursor.index + cursor.length);
      if (cursor.length === 0 && cursor.index > 0) {
        let before = text.substr(0, cursor.index - 1);
        text = before + after;
        cursor.index--;
      } else {
        let before = text.substr(0, cursor.index);
        text = before + after;
      }
      cursor.length = 0;
      renderText();
      renderCursor();
    } else if (e.code === 'ArrowLeft' && cursor.length === 0 && cursor.index > 0) {
      cursor.index--;
      cursor.length = 0;
      renderCursor();
    } else if (e.code === 'ArrowRight' && cursor.length === 0 && cursor.index < text.length) {
      cursor.index++;
      cursor.length = 0;
      renderCursor();
    } else if (e.code === 'KeyA' && ctrlDown) {
      cursor.index = 0;
      cursor.length = text.length;
      renderCursor();
    }
  } else if (isComposing) {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      console.log('preventing default');
      // Prevent cursor movement within the composition input. We can probably allow this, but this
      // emulates Google Docs for now.
      e.preventDefault();
      e.stopPropagation();
    }
  }
});
inputEl.addEventListener('keyup', e => {
  if (e.code === 'ControlLeft') {
    ctrlDown = false;
  }
});
inputEl.addEventListener('compositionstart', () => {
  isComposing = true;
  let before = text.substr(0, cursor.index);
  let after = text.substr(cursor.index + cursor.length);
  text = before + after;
  cursor.length = 0;
});
inputEl.addEventListener('compositionend', () => {
  isComposing = false;
  justFinishedComposition = true;
  composingText = '';
  processInput();
});
inputEl.addEventListener('input', e => {
  if (justFinishedComposition) {
    justFinishedComposition = false;
    inputEl.value = '';
    return;
  }
  if (isComposing) {
    composingText = e.data;
    renderText();
    renderCursor();
    return;
  }
  processInput();
});
function processInput() {
  let before = text.substr(0, cursor.index);
  let after = text.substr(cursor.index + cursor.length);

  text = before + inputEl.value + after;
  cursor.index += inputEl.value.length;
  inputEl.value = '';
  cursor.length = 0;
  renderText();
  renderCursor();
}

renderText();
renderCursor();
inputEl.focus();
