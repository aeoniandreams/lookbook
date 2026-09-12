(() => {
  let allBlocks = [];
  let selection = { categoryId: CATEGORIES[0].id, subcategoryId: null }; // subcategoryId null = "전체"
  let currentView = 'home'; // 'home' | 'category' — 로그인하면 홈이 제일 먼저 보인다
  let homeImages = []; // [{id, url, title, link}]
  let workingHomeImages = [];
  let editingBlockId = null;
  let currentBlockId = null;
  let workingSegments = []; // [{type:'text', id, text}] | [{type:'image', id, images:[{id,url}]}]
  let workingThumbnailIds = []; // 최대 2개, 선택 순서 유지

  const $ = sel => document.querySelector(sel);

  const categoryNav = $('#categoryNav');
  const homeNavBtn = $('#homeNavBtn');
  const contentHeader = $('#contentHeader');
  const blockGrid = $('#blockGrid');
  const emptyState = $('#emptyState');
  const breadcrumb = $('#breadcrumb');

  const homeView = $('#homeView');
  const homeMasonry = $('#homeMasonry');
  const addHomeImageBtn = $('#addHomeImageBtn');
  const homeEditModal = $('#homeEditModal');
  const homeImageList = $('#homeImageList');
  const addHomeImageRowBtn = $('#addHomeImageRowBtn');
  const homeEditCancelBtn = $('#homeEditCancelBtn');
  const homeEditSaveBtn = $('#homeEditSaveBtn');
  const sortDropdown = $('#sortDropdown');
  const sortDropdownBtn = $('#sortDropdownBtn');
  const sortDropdownLabel = $('#sortDropdownLabel');
  const sortDropdownMenu = $('#sortDropdownMenu');
  let sortOrder = 'alpha';

  const viewModal = $('#viewModal');
  const viewSegments = $('#viewSegments');
  const viewMeta = $('#viewMeta');
  const viewTitle = $('#viewTitle');

  const imageLightbox = $('#imageLightbox');
  const imageLightboxImg = $('#imageLightboxImg');

  const editModal = $('#editModal');
  const editModalTitle = $('#editModalTitle');
  const editCategorySelect = createDropdown($('#editCategoryDropdown'), {
    onSelect: (catId) => populateSubSelect(catId, null)
  });
  const editSubcategorySelect = createDropdown($('#editSubcategoryDropdown'));
  const editTitleInput = $('#editTitleInput');
  const editSegmentList = $('#editSegmentList');
  const addTextSegmentBtn = $('#addTextSegmentBtn');
  const addImageSegmentBtn = $('#addImageSegmentBtn');
  const addReferenceSegmentBtn = $('#addReferenceSegmentBtn');
  const editSaveBtn = $('#editSaveBtn');

  const addBlockBtn = $('#addBlockBtn');
  const emptyAddBtn = $('#emptyAddBtn');
  const viewActions = $('#viewActions');

  const sidebarUsernameBtn = $('#sidebarUsernameBtn');
  const sidebarAdminBadge = $('#sidebarAdminBadge');
  const sidebarLogoutBtn = $('#sidebarLogoutBtn');
  const adminPasswordModal = $('#adminPasswordModal');
  const adminPasswordInput = $('#adminPasswordInput');
  const adminPasswordError = $('#adminPasswordError');
  const adminPasswordSubmitBtn = $('#adminPasswordSubmitBtn');

  function icons() {
    if (window.lucide) lucide.createIcons();
    refreshMasonryLayouts();
  }

  // ---------- 레퍼런스 매소너리 컬럼 배치 ----------
  function masonryColumnCount() {
    return window.matchMedia('(max-width: 760px)').matches ? 2 : 3;
  }

  function layoutMasonryContainer(container) {
    const items = [...container.querySelectorAll('.reference-item')];
    if (!items.length) { container.innerHTML = ''; return; }
    // 한 번 컬럼으로 나누고 나면 DOM 순서는 "1번 컬럼 전부, 2번 컬럼 전부"가
    // 되어 원래 순서가 아니게 된다. 이 함수가 다시 호출될 때(창 크기 변경
    // 등) 그 DOM 순서를 그대로 다시 나누면 매번 순서가 달라져 버리므로,
    // 각 항목에 심어둔 원래 순번(data-order)으로 항상 다시 정렬한 뒤 나눈다.
    items.sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
    const columnCount = masonryColumnCount();
    const cols = Array.from({ length: columnCount }, () => {
      const col = document.createElement('div');
      col.className = 'reference-masonry-col';
      return col;
    });
    items.forEach((item, i) => cols[i % columnCount].appendChild(item));
    container.innerHTML = '';
    cols.forEach(col => container.appendChild(col));
  }

  function refreshMasonryLayouts() {
    document.querySelectorAll('.reference-masonry').forEach(layoutMasonryContainer);
  }

  let masonryResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(masonryResizeTimer);
    masonryResizeTimer = setTimeout(refreshMasonryLayouts, 150);
  });

  // lucide에 없는 아이콘을 직접 그려서 채워넣은 것 (lucide와 같은 24x24 스트로크 스타일)
  const CUSTOM_ICONS = {
    butterfly: `<path d="M12 9C15.5 4.5 19 1.5 21 2.5C23 3.5 23.5 6.5 23 10C22.6 12.5 19.5 14 15.5 13.8"/><path d="M12 9C8.5 4.5 5 1.5 3 2.5C1 3.5 .5 6.5 1 10C1.4 12.5 4.5 14 8.5 13.8"/><path d="M8.5 13.8C5.3 14.3 3 16 3 18C3 19.8 4.5 21 6.5 21C9.3 21 11.3 18.7 12 16"/><path d="M15.5 13.8C18.7 14.3 21 16 21 18C21 19.8 19.5 21 17.5 21C14.7 21 12.7 18.7 12 16"/>`,
    basketball: `<defs><clipPath id="bballClip"><circle cx="12" cy="12" r="10"/></clipPath></defs><circle cx="12" cy="12" r="10"/><g clip-path="url(#bballClip)"><path d="M2 12h20"/><path d="M12 2v20"/><path d="M3 4Q12 12 3 20"/><path d="M21 4Q12 12 21 20"/></g>`
  };

  function iconHTML(name) {
    if (CUSTOM_ICONS[name]) {
      return `<svg class="custom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CUSTOM_ICONS[name]}</svg>`;
    }
    return `<i data-lucide="${name}"></i>`;
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add('hidden'), 2200);
  }

  function uid() {
    return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // escapeHTML은 텍스트 노드 기준이라 따옴표를 안 바꿔준다. 속성값
  // (src="...") 안에 넣을 때는 따옴표도 이스케이프해야 값이 중간에 끊기지
  // 않는다.
  function escapeAttr(str) {
    return escapeHTML(str).replace(/"/g, '&quot;');
  }

  // ---------- 관리자 모드 ----------
  // 카드 추가/수정/삭제는 관리자 모드에서만 할 수 있다. 관리자 여부는
  // firebase-init.js의 별도 관리자 로그인 세션이 실제로 있는지로 정해진다
  // (그 세션으로 로그인되어 있어야 Firestore 쓰기가 허용되므로, 여기 UI
  // 상태를 흉내내는 것만으로는 저장/삭제가 통과하지 않는다). 그 세션은
  // 브라우저에 저장돼서 새로고침/재방문해도 유지되고, 사이드바 하단의
  // 아이디를 눌러 전환한다.
  let isAdmin = false;

  function applyAdminUI() {
    sidebarAdminBadge.classList.toggle('hidden', !isAdmin);
    addBlockBtn.classList.toggle('hidden', !isAdmin);
    emptyAddBtn.classList.toggle('hidden', !isAdmin);
    viewActions.classList.toggle('hidden', !isAdmin);
    addHomeImageBtn.classList.toggle('hidden', !isAdmin);
  }

  function syncAdminUIFromGlobal() {
    if (window.__adminAuthState !== null && window.__adminAuthState !== undefined) {
      isAdmin = !!window.__adminAuthState;
      applyAdminUI();
    }
  }

  // firebase-init.js가 이 이벤트를 이미 쏜 뒤에 이 코드가 실행됐을 수도
  // 있으니, 구독을 걸자마자 마지막으로 알려진 상태로 한 번 맞춰준다.
  window.addEventListener('admin-auth-changed', (e) => {
    isAdmin = !!(e.detail && e.detail.isAdmin);
    applyAdminUI();
  });
  syncAdminUIFromGlobal();

  function openAdminPasswordModal() {
    adminPasswordInput.value = '';
    adminPasswordError.classList.add('hidden');
    adminPasswordModal.classList.remove('hidden');
    adminPasswordInput.focus();
  }

  function closeAdminPasswordModal() {
    adminPasswordModal.classList.add('hidden');
  }

  function describeAdminAuthError(code) {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return '비밀번호가 올바르지 않아요.';
      case 'auth/too-many-requests':
        return '시도가 너무 많아요. 잠시 후 다시 시도해주세요.';
      case 'auth/network-request-failed':
        return '네트워크 오류예요. 인터넷 연결을 확인해주세요.';
      case 'admin/not-configured':
        return '관리자 계정이 설정되지 않았어요. js/firebase-config.js의 FIREBASE_ADMIN_EMAIL을 확인해주세요.';
      default:
        return code ? `확인에 실패했어요. (${code})` : '비밀번호를 입력해주세요.';
    }
  }

  async function trySubmitAdminPassword() {
    const password = adminPasswordInput.value;
    if (!password) return;
    adminPasswordSubmitBtn.disabled = true;
    adminPasswordError.classList.add('hidden');
    try {
      const result = await LookbookFirebase.verifyAdminPassword(password);
      if (result.ok) {
        // 실제 관리자 로그인이 곧 admin-auth-changed 이벤트로 UI에 반영된다.
        closeAdminPasswordModal();
        toast('관리자 모드로 전환됐어요.');
      } else {
        adminPasswordError.textContent = describeAdminAuthError(result.code);
        adminPasswordError.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      adminPasswordError.textContent = '확인 중 오류가 발생했어요. 네트워크를 확인해주세요.';
      adminPasswordError.classList.remove('hidden');
    } finally {
      adminPasswordSubmitBtn.disabled = false;
    }
  }

  sidebarUsernameBtn.addEventListener('click', () => {
    if (isAdmin) {
      // 토스트 메시지(2200ms 후 자동으로 사라짐)와 맞춰서, 메시지가 사라지는
      // 시점에 실제로 관리자 세션을 로그아웃한다(그 결과가 admin-auth-changed
      // 이벤트로 돌아와 UI를 유저 모드로 되돌린다).
      toast('유저 모드로 전환됩니다');
      setTimeout(() => { LookbookFirebase.logoutAdmin(); }, 2200);
    } else {
      openAdminPasswordModal();
    }
  });

  adminPasswordModal.querySelectorAll('[data-close-admin-password]').forEach(btn => {
    btn.addEventListener('click', closeAdminPasswordModal);
  });
  adminPasswordModal.addEventListener('click', e => {
    if (e.target === adminPasswordModal) closeAdminPasswordModal();
  });
  adminPasswordSubmitBtn.addEventListener('click', trySubmitAdminPassword);
  adminPasswordInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') trySubmitAdminPassword();
  });

  sidebarLogoutBtn.addEventListener('click', () => {
    // 관리자 모드에서는 먼저 유저 모드로만 내려가고, 유저 모드에서 한 번 더
    // 눌러야 실제로 로그인 화면까지 나간다.
    if (isAdmin) {
      LookbookFirebase.logoutAdmin();
    } else {
      LookbookFirebase.logout();
    }
  });

  applyAdminUI();

  // ---------- 텍스트 박스 서식(굵게/기울임/취소선/색/아이콘/토글) ----------
  // 수정창의 텍스트 박스는 contenteditable이라 서식이 곧바로 렌더링된 채로
  // 보이고 편집된다. 저장은 정제(sanitize)된 HTML 문자열로 한다.
  const RICH_TEXT_ICONS = CATEGORIES.map(c => c.icon);

  const RICH_ALLOWED_TAGS = new Set([
    'B', 'I', 'STRIKE', 'SPAN', 'DIV', 'BR', 'IMG',
    'SVG', 'PATH', 'CIRCLE', 'G', 'DEFS', 'CLIPPATH'
  ]);
  const RICH_ALLOWED_ATTRS = {
    SPAN: ['class'],
    DIV: ['class'],
    I: ['data-lucide', 'class'],
    IMG: ['src', 'alt'],
    SVG: ['viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'class'],
    PATH: ['d'],
    CIRCLE: ['cx', 'cy', 'r'],
    G: ['clip-path'],
    CLIPPATH: ['id']
  };

  // 허용 목록에 없는 태그는 자식만 남기고 벗겨내고, 허용된 태그는 허용되지
  // 않은 속성만 제거한다. 붙여넣기 등으로 들어올 수 있는 임의의 HTML을
  // 저장/렌더링 전에 항상 이 필터를 거치게 한다.
  function sanitizeRichNode(parent) {
    let node = parent.firstChild;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // SVG 요소는 tagName이 소문자(svg, path, circle...)로 나온다
        const tag = node.tagName.toUpperCase();
        if (!RICH_ALLOWED_TAGS.has(tag)) {
          const afterRemoval = node.nextSibling;
          const firstChild = node.firstChild;
          while (node.firstChild) parent.insertBefore(node.firstChild, node);
          parent.removeChild(node);
          node = firstChild || afterRemoval;
          continue;
        }
        const allowed = RICH_ALLOWED_ATTRS[tag] || [];
        [...node.attributes].forEach(attr => {
          if (!allowed.includes(attr.name.toLowerCase())) node.removeAttribute(attr.name);
        });
        sanitizeRichNode(node);
        node = node.nextSibling;
      } else if (node.nodeType === Node.TEXT_NODE) {
        node = node.nextSibling;
      } else {
        const toRemove = node;
        node = node.nextSibling;
        parent.removeChild(toRemove);
      }
    }
  }

  function sanitizeRichHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    sanitizeRichNode(div);
    return div.innerHTML;
  }

  function plainTextToHTML(text) {
    return escapeHTML(text || '').replace(/\n/g, '<br>');
  }

  function looksLikeHTML(str) {
    return /<[a-z][\s\S]*>/i.test(str || '');
  }

  function buildToggleHTML(titleHTML, bodyHTML, open) {
    return `<div class="text-toggle${open ? ' open' : ''}">` +
      `<div class="text-toggle-header">` +
        `<i data-lucide="chevron-right" class="toggle-chevron toggle-chevron-closed"></i>` +
        `<i data-lucide="chevron-down" class="toggle-chevron toggle-chevron-open"></i>` +
        `<span class="toggle-title">${titleHTML}</span>` +
      `</div>` +
      `<div class="toggle-body">${bodyHTML}</div>` +
    `</div>`;
  }

  // 이전(v1) 가벼운 마크업 문법으로 저장된 옛 카드를 위한 호환 변환.
  //   **굵게**  *기울임*  ~~취소선~~
  //   [gray]..[/gray] [accent]..[/accent] [red]..[/red]  [icon:이름]
  //   [toggle:제목]\n내용\n[/toggle]
  const V1_MARKUP_RE = /\*\*[\s\S]+?\*\*|~~[\s\S]+?~~|\[(?:gray|accent|red|icon:[a-z0-9-]+|toggle:)[\s\S]*?\]/;

  function markupInlineToHTML(escapedText) {
    let html = escapedText;
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');
    html = html.replace(/~~(.+?)~~/g, '<strike>$1</strike>');
    html = html.replace(/\[gray\](.+?)\[\/gray\]/g, '<span class="rt-gray">$1</span>');
    html = html.replace(/\[accent\](.+?)\[\/accent\]/g, '<span class="rt-accent">$1</span>');
    html = html.replace(/\[red\](.+?)\[\/red\]/g, '<span class="rt-red">$1</span>');
    html = html.replace(/\[icon:([a-z0-9-]+)\]/g, (m, name) =>
      `<span class="rt-icon">${iconHTML(name)}</span>`);
    return html;
  }

  function markupToHTML(rawText) {
    const escaped = escapeHTML(rawText || '');
    const toggles = [];
    let working = escaped.replace(/\[toggle:(.*?)\]\n?([\s\S]*?)\[\/toggle\]/g, (match, title, body) => {
      const idx = toggles.length;
      toggles.push(buildToggleHTML(
        markupInlineToHTML(title.trim()),
        markupInlineToHTML(body.trim()).replace(/\n/g, '<br>'),
        true
      ));
      return `@@TOGGLE${idx}@@`;
    });
    working = markupInlineToHTML(working);
    working = working.replace(/\n/g, '<br>');
    working = working.replace(/@@TOGGLE(\d+)@@/g, (m, i) => toggles[Number(i)]);
    return working;
  }

  function richTextSourceToHTML(text) {
    if (!text) return '';
    if (looksLikeHTML(text)) return sanitizeRichHTML(text);
    if (V1_MARKUP_RE.test(text)) return sanitizeRichHTML(markupToHTML(text));
    return plainTextToHTML(text);
  }

  // 수정창: 토글을 전부 펼친 채로 보여줘야 제목/내용을 편하게 고칠 수 있다.
  function richTextEditHTML(text) {
    const div = document.createElement('div');
    div.innerHTML = richTextSourceToHTML(text);
    div.querySelectorAll('.text-toggle').forEach(t => t.classList.add('open'));
    return div.innerHTML;
  }

  // 상세 보기: 토글은 항상 접힌 채로 시작한다.
  function richTextViewHTML(text) {
    const div = document.createElement('div');
    div.innerHTML = richTextSourceToHTML(text);
    div.querySelectorAll('.text-toggle').forEach(t => t.classList.remove('open'));
    return div.innerHTML;
  }

  function richTextIsEmpty(html) {
    if (!html) return true;
    const div = document.createElement('div');
    div.innerHTML = html;
    if (div.querySelector('svg, i[data-lucide], img')) return false;
    return !div.textContent.trim();
  }

  // 툴바의 글씨색 버튼: 선택 영역을 <span class="rt-xxx">로 감싼다
  // (execCommand foreColor는 인라인 color 스타일을 남겨 정제하기 까다로움).
  function wrapSelectionWithClass(editable, className) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!editable.contains(range.commonAncestorContainer)) return;
    const span = document.createElement('span');
    span.className = className;
    try {
      range.surroundContents(span);
    } catch (err) {
      const content = range.extractContents();
      span.appendChild(content);
      range.insertNode(span);
    }
    // surroundContents는 선택 범위가 텍스트 전체를 덮을 때 빈 문자열의
    // 앞/뒤 텍스트 노드를 형제로 남긴다. 이 노드들이 남아있으면 나중에
    // 전체 선택(Ctrl+A) 시 선택 범위가 span 밖으로 걸쳐져, 같은 버튼을
    // 다시 눌러 색을 빼는 토글이 span을 못 찾게 된다 — normalize로 정리.
    editable.normalize();
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.addRange(newRange);
    editable.dispatchEvent(new Event('input'));
  }

  // 선택 영역이 이미 해당 색 span에 완전히 감싸여 있는지 찾는다. 같은 색
  // 버튼을 다시 누르면 색을 빼서 원래 색(검은색)으로 되돌리기 위한 것.
  function closestColorSpan(node, className, editable) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el && el !== editable) {
      if (el.tagName === 'SPAN' && el.classList.contains(className)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function unwrapColorSpan(span, editable) {
    const sel = window.getSelection();
    const nodes = [...span.childNodes];
    span.replaceWith(...nodes);
    sel.removeAllRanges();
    if (nodes.length) {
      const newRange = document.createRange();
      newRange.setStartBefore(nodes[0]);
      newRange.setEndAfter(nodes[nodes.length - 1]);
      sel.addRange(newRange);
    }
    // replaceWith로 풀려나온 텍스트가 옆 텍스트 노드와 떨어진 별개
    // 노드로 남는데, Range 경계는 normalize에도 유지되므로 먼저 선택을
    // 잡은 뒤 합쳐줘야 나중에 같은 지점을 다시 선택했을 때 엇나가지 않는다.
    editable.normalize();
    editable.dispatchEvent(new Event('input'));
  }

  // ---------- 옛 데이터 형식(content + images + imageLayout) 호환 ----------
  // 예전에 저장된 카드는 segments 필드가 없다. 화면에 쓸 때만 즉석으로
  // segments 배열로 변환해서 다룬다 (저장은 항상 새 형식으로 한다).
  function buildGalleryRows(images, layout) {
    const validLayout = layout && layout.reduce((sum, n) => sum + n, 0) === images.length
      ? layout
      : images.map(() => 1);
    let idx = 0;
    return validLayout.map(size => {
      const row = images.slice(idx, idx + size);
      idx += size;
      return row;
    });
  }

  function migrateBlockToSegments(block) {
    if (block.segments) return block.segments;
    const segments = [];
    if (block.content) {
      segments.push({ type: 'text', id: uid(), text: block.content });
    }
    buildGalleryRows(block.images || [], block.imageLayout).forEach(row => {
      if (row.length) segments.push({ type: 'image', id: uid(), images: row });
    });
    return segments;
  }

  function allImages(block) {
    return migrateBlockToSegments(block)
      .filter(seg => seg.type === 'image')
      .flatMap(seg => seg.images);
  }

  // ---------- 사이드바 ----------
  function renderSidebar() {
    homeNavBtn.classList.toggle('active', currentView === 'home');

    categoryNav.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const count = allBlocks.filter(b => cat.subs.some(s => s.id === b.subcategoryId)).length;
      const isOpenCat = currentView === 'category' && selection.categoryId === cat.id;

      const catEl = document.createElement('div');
      catEl.className = 'nav-category' + (isOpenCat ? ' open' : '');

      const head = document.createElement('button');
      head.className = 'nav-category-head' + (isOpenCat && !selection.subcategoryId ? ' active' : '');
      head.innerHTML = `
        <span class="cat-icon">${iconHTML(cat.icon)}</span>
        <span class="cat-name">${cat.name}</span>
        <span class="cat-count">${count}</span>
        <i data-lucide="chevron-down" class="chevron"></i>
      `;
      head.addEventListener('click', () => {
        currentView = 'category';
        selection = { categoryId: cat.id, subcategoryId: null };
        renderSidebar();
        renderMain();
      });

      const subList = document.createElement('div');
      subList.className = 'nav-sub-list';
      cat.subs.forEach(sub => {
        const subCount = allBlocks.filter(b => b.subcategoryId === sub.id).length;
        const subBtn = document.createElement('button');
        subBtn.className = 'nav-sub-item' + (isOpenCat && selection.subcategoryId === sub.id ? ' active' : '');
        subBtn.innerHTML = `<span>${sub.name}</span><span class="cat-count">${subCount}</span>`;
        subBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          currentView = 'category';
          selection = { categoryId: cat.id, subcategoryId: sub.id };
          renderSidebar();
          renderMain();
          closeMobileSidebar();
        });
        subList.appendChild(subBtn);
      });

      catEl.appendChild(head);
      catEl.appendChild(subList);
      categoryNav.appendChild(catEl);
    });
    icons();
  }

  homeNavBtn.addEventListener('click', () => {
    currentView = 'home';
    renderSidebar();
    renderMain();
    closeMobileSidebar();
  });

  // ---------- 메인 그리드 ----------
  function currentCategory() {
    return CATEGORIES.find(c => c.id === selection.categoryId);
  }

  function visibleBlocks() {
    const cat = currentCategory();
    if (!cat) return [];
    let blocks;
    if (selection.subcategoryId) {
      blocks = allBlocks.filter(b => b.subcategoryId === selection.subcategoryId);
    } else {
      const subIds = cat.subs.map(s => s.id);
      blocks = allBlocks.filter(b => subIds.includes(b.subcategoryId));
    }
    const sorted = blocks.slice();
    if (sortOrder === 'newest') {
      sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortOrder === 'oldest') {
      sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
    }
    return sorted;
  }

  function renderBreadcrumb() {
    const cat = currentCategory();
    if (!cat) { breadcrumb.textContent = ''; return; }
    if (selection.subcategoryId) {
      const sub = cat.subs.find(s => s.id === selection.subcategoryId);
      breadcrumb.innerHTML = `<span class="crumb-muted">${cat.name}</span> <i data-lucide="chevron-right"></i> ${sub ? sub.name : ''}`;
    } else {
      breadcrumb.innerHTML = `${cat.name} <i data-lucide="chevron-right"></i> <span class="crumb-muted">전체</span>`;
    }
    icons();
  }

  function thumbnailHTML(block) {
    const images = allImages(block);
    const thumbs = (block.thumbnailIds || [])
      .map(id => images.find(img => img.id === id))
      .filter(Boolean);
    const source = thumbs.length ? thumbs : (images.length ? [images[0]] : []);

    if (!source.length) {
      return `<div class="thumb-empty"><i data-lucide="image"></i></div>`;
    }
    return source.map(img => `<div class="thumb-half"><img src="${img.url}" alt="" loading="lazy"></div>`).join('');
  }

  function renderGrid() {
    const blocks = visibleBlocks();
    blockGrid.innerHTML = '';

    if (!blocks.length) {
      emptyState.classList.remove('hidden');
      blockGrid.classList.add('hidden');
      icons();
      return;
    }
    emptyState.classList.add('hidden');
    blockGrid.classList.remove('hidden');

    blocks.forEach(block => {
      const thumbCount = (block.thumbnailIds && block.thumbnailIds.length) || (allImages(block).length ? 1 : 0);
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-thumb thumb-count-${thumbCount}">
          ${thumbnailHTML(block)}
        </div>
        <div class="card-title">${escapeHTML(block.title || '(제목 없음)')}</div>
      `;
      card.addEventListener('click', () => openViewModal(block.id));
      blockGrid.appendChild(card);
    });
    icons();
  }

  function renderMain() {
    if (currentView === 'home') {
      contentHeader.classList.add('hidden');
      blockGrid.classList.add('hidden');
      emptyState.classList.add('hidden');
      homeView.classList.remove('hidden');
      renderHomeView();
    } else {
      homeView.classList.add('hidden');
      contentHeader.classList.remove('hidden');
      renderBreadcrumb();
      renderGrid();
    }
  }

  // ---------- 홈 화면 ----------
  function homeItemViewHTML(item, index) {
    const titleHTML = richTextSourceToHTML(item.title || '');
    const hasTitle = !richTextIsEmpty(titleHTML);
    return `<div class="reference-item home-image-item" data-order="${index}" data-link="${escapeAttr(item.link || '')}">
      <img src="${escapeAttr(item.url)}" alt="" loading="lazy">
      ${hasTitle ? `<div class="reference-comment"><div class="reference-comment-text">${titleHTML}</div></div>` : ''}
    </div>`;
  }

  function renderHomeView() {
    homeMasonry.innerHTML = homeImages.map(homeItemViewHTML).join('');
    icons();
  }

  homeMasonry.addEventListener('click', (e) => {
    const item = e.target.closest('.reference-item');
    if (!item) return;
    // 레퍼런스 토글과 같은 모바일 두 번 탭 규칙: 코멘트(제목)가 있으면 첫
    // 탭에서는 오버레이만 보여주고, 이미 펼쳐진 상태에서 한 번 더 탭해야
    // 링크로 이동한다. 데스크탑은 호버로 이미 보이는 상태라 한 번 클릭으로
    // 바로 이동한다.
    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    const hasComment = !!item.querySelector('.reference-comment');
    if (isMobile && hasComment && !item.classList.contains('revealed')) {
      item.classList.add('revealed');
      return;
    }
    const link = item.dataset.link;
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  });

  function openHomeEditModal() {
    workingHomeImages = homeImages.map(img => ({ ...img }));
    renderHomeImageList();
    homeEditModal.classList.remove('hidden');
    icons();
    captureHomeEditModalSnapshot();
  }

  function closeHomeEditModal() {
    homeEditModal.classList.add('hidden');
    workingHomeImages = [];
  }

  // 저장하지 않고 닫으려 할 때(뒤로가기/바깥 클릭/Esc) 확인창을 띄우기 위해,
  // 모달을 연 시점의 상태를 스냅샷으로 저장해두고 현재 상태와 비교한다.
  let homeEditModalSnapshot = null;
  function captureHomeEditModalSnapshot() {
    homeEditModalSnapshot = JSON.stringify(workingHomeImages);
  }
  function isHomeEditModalDirty() {
    return homeEditModalSnapshot !== JSON.stringify(workingHomeImages);
  }
  function requestCloseHomeEditModal() {
    if (isHomeEditModalDirty() && !window.confirm('저장하지 않은 내용이 있습니다. 닫으시겠습니까?')) return;
    closeHomeEditModal();
  }

  addHomeImageBtn.addEventListener('click', openHomeEditModal);
  homeEditCancelBtn.addEventListener('click', requestCloseHomeEditModal);
  homeEditModal.querySelectorAll('[data-close-home-edit]').forEach(btn => {
    btn.addEventListener('click', requestCloseHomeEditModal);
  });
  homeEditModal.addEventListener('click', e => {
    if (e.target === homeEditModal) requestCloseHomeEditModal();
  });

  // 드래그로 순서 바꾸기(레퍼런스 토글 항목과 같은 방식)
  let dragHomeImageId = null;

  function reorderHomeImage(fromId, toId, after) {
    const fromIndex = workingHomeImages.findIndex(i => i.id === fromId);
    if (fromIndex === -1) return;
    const [moved] = workingHomeImages.splice(fromIndex, 1);
    let toIndex = workingHomeImages.findIndex(i => i.id === toId);
    if (toIndex === -1) { workingHomeImages.push(moved); return; }
    if (after) toIndex += 1;
    workingHomeImages.splice(toIndex, 0, moved);
  }

  function buildHomeImageRow(item) {
    const row = document.createElement('div');
    row.className = 'reference-manage-row';
    row.innerHTML = `
      <span class="reference-drag-handle" draggable="true" title="드래그해서 순서 바꾸기"><i data-lucide="grip-vertical"></i></span>
      <img class="reference-manage-thumb" src="${escapeAttr(item.url)}" alt="" onerror="this.classList.add('broken')">
      <div class="reference-manage-fields">
        <input type="url" class="home-url-input" placeholder="이미지 주소(URL)" value="${escapeAttr(item.url || '')}">
        <div class="home-title-row">
          <button type="button" class="home-title-bold-btn" title="굵게"><b>B</b></button>
          <div class="home-title-editable" contenteditable="true" data-placeholder="제목 (호버/탭 시 표시, 엔터로 줄바꿈 가능)"></div>
        </div>
        <input type="url" class="home-link-input" placeholder="이동할 링크 (선택)" value="${escapeAttr(item.link || '')}">
      </div>
      <button type="button" class="reference-remove-btn" title="삭제"><i data-lucide="x"></i></button>
    `;
    const thumb = row.querySelector('.reference-manage-thumb');
    row.querySelector('.home-url-input').addEventListener('input', (e) => {
      item.url = e.target.value;
      thumb.classList.remove('broken');
      thumb.src = item.url;
    });

    const titleEditable = row.querySelector('.home-title-editable');
    titleEditable.innerHTML = richTextEditHTML(item.title || '');
    item.title = titleEditable.innerHTML; // 옛 일반 텍스트 제목도 곧바로 새 형식으로 맞춘다
    titleEditable.addEventListener('input', () => { item.title = titleEditable.innerHTML; });
    titleEditable.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    const boldBtn = row.querySelector('.home-title-bold-btn');
    boldBtn.addEventListener('mousedown', e => e.preventDefault());
    boldBtn.addEventListener('click', () => {
      titleEditable.focus();
      document.execCommand('bold', false, null);
      titleEditable.dispatchEvent(new Event('input'));
    });

    row.querySelector('.home-link-input').addEventListener('input', (e) => { item.link = e.target.value; });
    row.querySelector('.reference-remove-btn').addEventListener('click', () => {
      workingHomeImages = workingHomeImages.filter(i => i.id !== item.id);
      renderHomeImageList();
    });

    const handle = row.querySelector('.reference-drag-handle');
    handle.addEventListener('dragstart', (e) => {
      dragHomeImageId = item.id;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
    });
    handle.addEventListener('dragend', () => {
      dragHomeImageId = null;
      homeImageList.querySelectorAll('.reference-manage-row').forEach(r => {
        r.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
      });
    });
    row.addEventListener('dragover', (e) => {
      if (dragHomeImageId === null) return;
      e.preventDefault();
      const isAfter = (e.clientY - row.getBoundingClientRect().top) > row.offsetHeight / 2;
      row.classList.toggle('drag-over-top', !isAfter);
      row.classList.toggle('drag-over-bottom', isAfter);
    });
    row.addEventListener('dragleave', () => {
      row.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over-top', 'drag-over-bottom');
      if (dragHomeImageId === null || dragHomeImageId === item.id) return;
      const isAfter = (e.clientY - row.getBoundingClientRect().top) > row.offsetHeight / 2;
      reorderHomeImage(dragHomeImageId, item.id, isAfter);
      dragHomeImageId = null;
      renderHomeImageList();
    });

    return row;
  }

  function renderHomeImageList() {
    homeImageList.innerHTML = '';
    if (!workingHomeImages.length) {
      homeImageList.innerHTML = `<p class="hint">아직 추가된 이미지가 없어요.</p>`;
    } else {
      workingHomeImages.forEach(item => homeImageList.appendChild(buildHomeImageRow(item)));
    }
    icons();
  }

  addHomeImageRowBtn.addEventListener('click', () => {
    workingHomeImages.push({ id: uid(), url: '', title: '', link: '' });
    renderHomeImageList();
  });

  homeEditSaveBtn.addEventListener('click', async () => {
    homeEditSaveBtn.disabled = true;
    try {
      const items = workingHomeImages
        .filter(it => it.url && it.url.trim())
        .map(({ id, url, title, link }) => ({
          id,
          url: url.trim(),
          title: sanitizeRichHTML(title || ''),
          link: (link || '').trim()
        }));
      await LookbookFirebase.saveHomeImages(items);
      closeHomeEditModal();
      toast('저장했어요.');
    } catch (err) {
      console.error(err);
      toast('저장에 실패했어요. 네트워크를 확인해주세요.');
    } finally {
      homeEditSaveBtn.disabled = false;
    }
  });

  sortDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = sortDropdownMenu.classList.contains('hidden');
    sortDropdownMenu.classList.toggle('hidden', !willOpen);
    sortDropdown.classList.toggle('open', willOpen);
    sortDropdownBtn.setAttribute('aria-expanded', String(willOpen));
  });

  function closeSortDropdown() {
    sortDropdownMenu.classList.add('hidden');
    sortDropdown.classList.remove('open');
    sortDropdownBtn.setAttribute('aria-expanded', 'false');
  }

  sortDropdownMenu.querySelectorAll('.dropdown-option').forEach(opt => {
    opt.addEventListener('click', () => {
      sortOrder = opt.dataset.value;
      sortDropdownLabel.textContent = opt.textContent;
      sortDropdownMenu.querySelectorAll('.dropdown-option').forEach(o => {
        o.classList.toggle('active', o === opt);
        o.setAttribute('aria-selected', String(o === opt));
      });
      closeSortDropdown();
      renderGrid();
    });
  });

  document.addEventListener('click', (e) => {
    if (!sortDropdown.contains(e.target)) closeSortDropdown();
  });

  // ---------- 상세 보기 모달 ----------
  function referenceToggleViewHTML(seg) {
    const titleHTML = escapeHTML((seg.title || '').trim() || '레퍼런스');
    const itemsHTML = (seg.items || []).map((item, index) => `
      <div class="reference-item" data-order="${index}">
        <img src="${escapeAttr(item.url)}" alt="" loading="lazy">
        ${item.comment ? `<div class="reference-comment"><div class="reference-comment-text">${escapeHTML(item.comment)}</div></div>` : ''}
      </div>
    `).join('');
    return `<div class="reference-toggle">
      <div class="reference-toggle-header">
        <i data-lucide="chevrons-right" class="toggle-chevron toggle-chevron-closed"></i>
        <i data-lucide="chevrons-down" class="toggle-chevron toggle-chevron-open"></i>
        <span class="toggle-title">${titleHTML}</span>
      </div>
      <div class="reference-toggle-body"><div class="reference-masonry">${itemsHTML}</div></div>
    </div>`;
  }

  function segmentViewHTML(seg) {
    if (seg.type === 'text') {
      return `<div class="view-text-block">${richTextViewHTML(seg.text || '')}</div>`;
    }
    if (seg.type === 'reference') {
      return referenceToggleViewHTML(seg);
    }
    const cls = seg.images.length > 1 ? 'gallery-row multi' : 'gallery-row single';
    const galleryHTML = `<div class="${cls}">${seg.images.map(img => `<img src="${img.url}" alt="" loading="lazy">`).join('')}</div>`;
    const comment = (seg.comment || '').trim();
    if (!comment) return galleryHTML;
    return `<div class="gallery-block">${galleryHTML}<p class="gallery-comment">${escapeHTML(comment)}</p></div>`;
  }

  function openViewModal(blockId) {
    const block = allBlocks.find(b => b.id === blockId);
    if (!block) return;
    viewModal.dataset.blockId = blockId;

    const segments = migrateBlockToSegments(block);
    viewSegments.innerHTML = segments.map(segmentViewHTML).join('');

    const sub = findSub(block.subcategoryId);
    const cat = findCategoryBySub(block.subcategoryId);
    viewMeta.textContent = cat ? `${cat.name} · ${sub.name}` : '';
    viewTitle.textContent = block.title || '(제목 없음)';

    viewModal.classList.remove('hidden');
    icons();
  }

  function closeViewModal() {
    viewModal.classList.add('hidden');
    viewModal.dataset.blockId = '';
  }

  let lightboxSourceItem = null;
  function openImageLightbox(url, sourceItem) {
    imageLightboxImg.src = url;
    imageLightbox.classList.remove('hidden');
    lightboxSourceItem = sourceItem || null;
  }

  function closeImageLightbox() {
    imageLightbox.classList.add('hidden');
    imageLightboxImg.src = '';
    // 모바일에서 두 번째 탭으로 원본을 열었던 항목은, 닫으면 코멘트가 가려진
    // 처음 모습으로 되돌려놓는다. 그 항목만 되돌리고, 다른 항목의 펼침
    // 상태는 그대로 둔다.
    if (lightboxSourceItem) {
      lightboxSourceItem.classList.remove('revealed');
      lightboxSourceItem = null;
    }
  }

  // 배경이든 이미지든 닫기 버튼이든, 라이트박스 안 어디를 눌러도 닫힌다.
  imageLightbox.addEventListener('click', closeImageLightbox);

  $('[data-close-view]').addEventListener('click', closeViewModal);
  viewModal.addEventListener('click', e => {
    if (e.target === viewModal) { closeViewModal(); return; }
    const refItem = e.target.closest('.reference-item');
    if (refItem) {
      // 모바일(호버가 없는 화면)에서는 첫 탭으로 코멘트 오버레이만 보여주고,
      // 이미 펼쳐진 상태에서 한 번 더 탭해야 원본이 뜬다. 코멘트가 없는
      // 항목은 보여줄 게 없으니 바로 원본을 연다. 데스크탑은 마우스 호버로
      // 이미 오버레이가 보이는 상태라 한 번 클릭으로 바로 연다.
      const isMobile = window.matchMedia('(max-width: 760px)').matches;
      const hasComment = !!refItem.querySelector('.reference-comment');
      if (isMobile && hasComment && !refItem.classList.contains('revealed')) {
        refItem.classList.add('revealed');
        return;
      }
      const img = refItem.querySelector('img');
      if (img) openImageLightbox(img.src, refItem);
      return;
    }
    const plainImg = e.target.closest('.gallery-row img, .view-text-block img');
    if (plainImg) {
      openImageLightbox(plainImg.src);
      return;
    }
    const header = e.target.closest('.text-toggle-header, .reference-toggle-header');
    if (header) {
      header.closest('.text-toggle, .reference-toggle').classList.toggle('open');
    }
  });

  $('#viewEditBtn').addEventListener('click', () => {
    const id = viewModal.dataset.blockId;
    closeViewModal();
    openEditModal(id);
  });

  $('#viewDeleteBtn').addEventListener('click', async () => {
    const id = viewModal.dataset.blockId;
    const block = allBlocks.find(b => b.id === id);
    if (!block) return;
    if (!confirm('이 카드를 삭제할까요? 되돌릴 수 없어요.')) return;
    try {
      await LookbookFirebase.removeBlock(block);
      closeViewModal();
      toast('카드를 삭제했어요.');
    } catch (err) {
      console.error(err);
      toast('삭제에 실패했어요. 다시 시도해주세요.');
    }
  });

  // 정렬 드롭다운과 같은 커스텀 레이아웃의 선택 목록. 클릭으로 열고 닫고,
  // 옵션을 고르면 강조 표시와 라벨을 갱신한다. setOptions로 프로그램적으로
  // 선택값을 지정하는 것과 사용자가 실제로 클릭해서 고르는 것을 구분해서,
  // 전자는 onSelect 콜백을 부르지 않는다(초기값 채울 때 불필요한 재실행 방지).
  function createDropdown(root, { onSelect } = {}) {
    const btn = root.querySelector('.dropdown-btn');
    const label = root.querySelector('.dropdown-label');
    const menu = root.querySelector('.dropdown-menu');
    let currentValue = null;

    function close() {
      menu.classList.add('hidden');
      root.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !willOpen);
      root.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) close();
    });

    function applySelection(value) {
      currentValue = value;
      let matched = null;
      menu.querySelectorAll('.dropdown-option').forEach(li => {
        const isMatch = li.dataset.value === value;
        li.classList.toggle('active', isMatch);
        li.setAttribute('aria-selected', String(isMatch));
        if (isMatch) matched = li;
      });
      label.textContent = matched ? matched.textContent : '';
    }

    return {
      setOptions(options, selectedValue) {
        menu.innerHTML = options.map(o =>
          `<li class="dropdown-option" data-value="${escapeAttr(o.value)}" role="option" aria-selected="false">${escapeHTML(o.label)}</li>`
        ).join('');
        menu.querySelectorAll('.dropdown-option').forEach(li => {
          li.addEventListener('click', () => {
            applySelection(li.dataset.value);
            close();
            if (onSelect) onSelect(li.dataset.value);
          });
        });
        applySelection(selectedValue);
      },
      get value() { return currentValue; }
    };
  }

  // ---------- 추가/수정 모달 ----------
  function populateCategorySelects(selectedCatId, selectedSubId) {
    editCategorySelect.setOptions(
      CATEGORIES.map(c => ({ value: c.id, label: c.name })),
      selectedCatId
    );
    populateSubSelect(selectedCatId, selectedSubId);
  }

  function populateSubSelect(catId, selectedSubId) {
    const cat = CATEGORIES.find(c => c.id === catId);
    const validSubId = selectedSubId && cat.subs.some(s => s.id === selectedSubId)
      ? selectedSubId
      : cat.subs[0].id;
    editSubcategorySelect.setOptions(
      cat.subs.map(s => ({ value: s.id, label: s.name })),
      validSubId
    );
  }

  function openEditModal(blockId) {
    const block = blockId ? allBlocks.find(b => b.id === blockId) : null;
    editingBlockId = block ? block.id : null;
    currentBlockId = block ? block.id : uid();

    editModalTitle.textContent = block ? '카드 수정' : '새 카드 추가';
    editTitleInput.value = block ? block.title || '' : '';
    workingSegments = block
      ? migrateBlockToSegments(block).map(seg => {
        if (seg.type === 'text') return { type: 'text', id: seg.id, text: seg.text || '' };
        if (seg.type === 'reference') {
          return {
            type: 'reference',
            id: seg.id,
            title: seg.title || '',
            items: (seg.items || []).map(it => ({ id: it.id, url: it.url, comment: it.comment || '' }))
          };
        }
        return {
          type: 'image',
          id: seg.id,
          images: seg.images.map(img => ({ id: img.id, url: img.url })),
          comment: seg.comment || ''
        };
      })
      : [];
    workingThumbnailIds = block ? [...(block.thumbnailIds || [])] : [];

    const defaultCat = block ? findCategoryBySub(block.subcategoryId).id : (selection.categoryId || CATEGORIES[0].id);
    const defaultSub = block ? block.subcategoryId : (selection.subcategoryId || CATEGORIES.find(c => c.id === defaultCat).subs[0].id);
    populateCategorySelects(defaultCat, defaultSub);

    renderSegmentList();
    editModal.classList.remove('hidden');
    icons();
    captureEditModalSnapshot();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editingBlockId = null;
    currentBlockId = null;
    workingSegments = [];
    workingThumbnailIds = [];
  }

  // 저장하지 않고 닫으려 할 때(뒤로가기/바깥 클릭/Esc) 확인창을 띄우기 위해,
  // 모달을 연 시점의 상태를 스냅샷으로 저장해두고 현재 상태와 비교한다.
  let editModalSnapshot = null;
  function captureEditModalSnapshot() {
    editModalSnapshot = JSON.stringify({
      title: editTitleInput.value,
      subcategoryId: editSubcategorySelect.value,
      thumbnailIds: workingThumbnailIds,
      segments: workingSegments
    });
  }
  function isEditModalDirty() {
    return editModalSnapshot !== JSON.stringify({
      title: editTitleInput.value,
      subcategoryId: editSubcategorySelect.value,
      thumbnailIds: workingThumbnailIds,
      segments: workingSegments
    });
  }
  function requestCloseEditModal() {
    if (isEditModalDirty() && !window.confirm('저장하지 않은 내용이 있습니다. 닫으시겠습니까?')) return;
    closeEditModal();
  }

  $('[data-close-edit]').addEventListener('click', requestCloseEditModal);
  $('#editCancelBtn').addEventListener('click', requestCloseEditModal);
  editModal.addEventListener('mousedown', e => {
    if (e.target.closest('.toggle-chevron')) e.preventDefault();
  });
  editModal.addEventListener('click', e => {
    if (e.target === editModal) { requestCloseEditModal(); return; }
    editModal.querySelectorAll('.rt-icon-menu').forEach(menu => {
      if (!menu.closest('.rt-icon-picker').contains(e.target)) menu.classList.add('hidden');
    });
    const chevron = e.target.closest('.toggle-chevron');
    if (chevron) {
      chevron.closest('.text-toggle').classList.toggle('open');
    }
  });

  $('#addBlockBtn').addEventListener('click', () => openEditModal(null));
  $('#emptyAddBtn').addEventListener('click', () => openEditModal(null));

  // ---------- 구성(텍스트/이미지 박스) 편집 ----------
  function addTextSegment() {
    workingSegments.push({ type: 'text', id: uid(), text: '' });
    renderSegmentList();
  }

  function addImageSegment() {
    workingSegments.push({ type: 'image', id: uid(), images: [], comment: '' });
    renderSegmentList();
  }

  function addReferenceSegment() {
    workingSegments.push({ type: 'reference', id: uid(), title: '', items: [] });
    renderSegmentList();
  }

  addTextSegmentBtn.addEventListener('click', addTextSegment);
  addImageSegmentBtn.addEventListener('click', addImageSegment);
  addReferenceSegmentBtn.addEventListener('click', addReferenceSegment);

  // 드래그로 순서 바꾸기: 드래그 시작한 박스의 인덱스를 여기 담아두고, 드롭된
  // 박스 위에서 마우스가 위쪽 절반/아래쪽 절반 중 어디였는지로 삽입 위치를
  // 정한다.
  let dragSegmentIndex = null;

  function reorderSegment(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [seg] = workingSegments.splice(fromIndex, 1);
    const adjustedTarget = fromIndex < toIndex ? toIndex - 1 : toIndex;
    workingSegments.splice(adjustedTarget, 0, seg);
    renderSegmentList();
  }

  function attachSegmentDragHandlers(box, index) {
    const handle = box.querySelector('.segment-drag-handle');
    handle.addEventListener('dragstart', (e) => {
      dragSegmentIndex = index;
      box.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    });
    handle.addEventListener('dragend', () => {
      dragSegmentIndex = null;
      editSegmentList.querySelectorAll('.segment-box').forEach(b => {
        b.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
      });
    });
    box.addEventListener('dragover', (e) => {
      if (dragSegmentIndex === null) return;
      e.preventDefault();
      const isAfter = (e.clientY - box.getBoundingClientRect().top) > box.offsetHeight / 2;
      box.classList.toggle('drag-over-top', !isAfter);
      box.classList.toggle('drag-over-bottom', isAfter);
    });
    box.addEventListener('dragleave', () => {
      box.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    box.addEventListener('drop', (e) => {
      e.preventDefault();
      box.classList.remove('drag-over-top', 'drag-over-bottom');
      if (dragSegmentIndex === null) return;
      const isAfter = (e.clientY - box.getBoundingClientRect().top) > box.offsetHeight / 2;
      reorderSegment(dragSegmentIndex, index + (isAfter ? 1 : 0));
      dragSegmentIndex = null;
    });
  }

  function removeSegment(index) {
    const seg = workingSegments[index];
    workingThumbnailIds = workingThumbnailIds.filter(id =>
      !(seg.type === 'image' && seg.images.some(img => img.id === id)));
    workingSegments.splice(index, 1);
    renderSegmentList();
  }

  function buildImageCell(img, seg) {
    const thumbIndex = workingThumbnailIds.indexOf(img.id);
    const cell = document.createElement('div');
    cell.className = 'image-manage-cell' + (thumbIndex > -1 ? ' selected' : '');
    cell.innerHTML = `
      <img src="${img.url}" alt="" onerror="this.closest('.image-manage-cell').classList.add('broken')">
      <button type="button" class="image-remove" title="이미지 삭제"><i data-lucide="x"></i></button>
      <button type="button" class="image-thumb-toggle" title="썸네일로 선택">
        ${thumbIndex > -1 ? `<span class="thumb-badge">${thumbIndex + 1}</span>` : `<i data-lucide="star"></i>`}
      </button>
    `;
    cell.querySelector('.image-remove').addEventListener('click', () => {
      seg.images = seg.images.filter(i => i.id !== img.id);
      workingThumbnailIds = workingThumbnailIds.filter(id => id !== img.id);
      renderSegmentList();
    });
    cell.querySelector('.image-thumb-toggle').addEventListener('click', () => {
      const idx = workingThumbnailIds.indexOf(img.id);
      if (idx > -1) {
        workingThumbnailIds.splice(idx, 1);
      } else {
        if (workingThumbnailIds.length >= 2) {
          toast('썸네일은 최대 2개까지 선택할 수 있어요.');
          return;
        }
        workingThumbnailIds.push(img.id);
      }
      renderSegmentList();
    });
    return cell;
  }

  // 레퍼런스 토글 안의 이미지 항목도 세그먼트 박스와 같은 방식(드래그 핸들 +
  // 위/아래 절반 판정)으로 순서를 바꿀 수 있게 한다. 여러 레퍼런스 토글이
  // 동시에 있을 수 있어서, 드래그 중인 항목이 "어느 seg"에서 왔는지도 같이
  // 기억해두고 다른 토글로는 넘어가지 않게 막는다.
  let dragReferenceState = null;

  function reorderReferenceItem(seg, fromId, toId, after) {
    const fromIndex = seg.items.findIndex(i => i.id === fromId);
    if (fromIndex === -1) return;
    const [moved] = seg.items.splice(fromIndex, 1);
    let toIndex = seg.items.findIndex(i => i.id === toId);
    if (toIndex === -1) { seg.items.push(moved); return; }
    if (after) toIndex += 1;
    seg.items.splice(toIndex, 0, moved);
  }

  function buildReferenceItemRow(item, seg) {
    const row = document.createElement('div');
    row.className = 'reference-manage-row';
    row.innerHTML = `
      <span class="reference-drag-handle" draggable="true" title="드래그해서 순서 바꾸기"><i data-lucide="grip-vertical"></i></span>
      <img class="reference-manage-thumb" src="${escapeAttr(item.url)}" alt="" onerror="this.classList.add('broken')">
      <div class="reference-manage-fields">
        <input type="url" class="reference-url-input" placeholder="이미지 주소(URL)" value="${escapeAttr(item.url || '')}">
        <input type="text" class="reference-comment-input" placeholder="코멘트 (선택)" value="${escapeAttr(item.comment || '')}">
      </div>
      <button type="button" class="reference-remove-btn" title="삭제"><i data-lucide="x"></i></button>
    `;
    const thumb = row.querySelector('.reference-manage-thumb');
    row.querySelector('.reference-url-input').addEventListener('input', (e) => {
      item.url = e.target.value;
      thumb.classList.remove('broken');
      thumb.src = item.url;
    });
    row.querySelector('.reference-comment-input').addEventListener('input', (e) => {
      item.comment = e.target.value;
    });
    row.querySelector('.reference-remove-btn').addEventListener('click', () => {
      seg.items = seg.items.filter(i => i.id !== item.id);
      renderSegmentList();
    });

    const handle = row.querySelector('.reference-drag-handle');
    handle.addEventListener('dragstart', (e) => {
      e.stopPropagation(); // 바깥 세그먼트 박스의 드래그 로직과 섞이지 않게 막는다
      dragReferenceState = { seg, itemId: item.id };
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
    });
    handle.addEventListener('dragend', (e) => {
      e.stopPropagation();
      dragReferenceState = null;
      editSegmentList.querySelectorAll('.reference-manage-row').forEach(r => {
        r.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
      });
    });
    row.addEventListener('dragover', (e) => {
      if (!dragReferenceState || dragReferenceState.seg !== seg) return;
      e.preventDefault();
      e.stopPropagation();
      const isAfter = (e.clientY - row.getBoundingClientRect().top) > row.offsetHeight / 2;
      row.classList.toggle('drag-over-top', !isAfter);
      row.classList.toggle('drag-over-bottom', isAfter);
    });
    row.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      row.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    row.addEventListener('drop', (e) => {
      if (!dragReferenceState || dragReferenceState.seg !== seg) return;
      e.preventDefault();
      e.stopPropagation();
      row.classList.remove('drag-over-top', 'drag-over-bottom');
      if (dragReferenceState.itemId !== item.id) {
        const isAfter = (e.clientY - row.getBoundingClientRect().top) > row.offsetHeight / 2;
        reorderReferenceItem(seg, dragReferenceState.itemId, item.id, isAfter);
        renderSegmentList();
      }
      dragReferenceState = null;
    });

    return row;
  }

  function buildRichTextToolbar(editable) {
    const toolbar = document.createElement('div');
    toolbar.className = 'rt-toolbar';
    toolbar.innerHTML = `
      <button type="button" class="rt-btn" data-cmd="bold" title="굵게"><b>B</b></button>
      <button type="button" class="rt-btn rt-italic" data-cmd="italic" title="기울임">I</button>
      <button type="button" class="rt-btn rt-strike" data-cmd="strikeThrough" title="취소선">S</button>
      <span class="rt-sep"></span>
      <button type="button" class="rt-btn rt-swatch rt-swatch-gray" data-color="rt-gray" title="회색 글씨"></button>
      <button type="button" class="rt-btn rt-swatch rt-swatch-accent" data-color="rt-accent" title="포인트 색 글씨"></button>
      <button type="button" class="rt-btn rt-swatch rt-swatch-red" data-color="rt-red" title="빨간 글씨"></button>
      <span class="rt-sep"></span>
      <div class="rt-icon-picker">
        <button type="button" class="rt-btn" title="아이콘 삽입"><i data-lucide="smile-plus"></i></button>
        <div class="rt-icon-menu hidden">
          ${RICH_TEXT_ICONS.map(name => `<button type="button" class="rt-icon-option" data-icon="${name}">${iconHTML(name)}</button>`).join('')}
        </div>
      </div>
      <button type="button" class="rt-btn" data-insert-image title="이미지 삽입"><i data-lucide="image"></i></button>
      <button type="button" class="rt-btn" data-toggle-insert title="토글(펼침/접힘) 삽입"><i data-lucide="chevron-right"></i></button>
    `;

    // 툴바 버튼 클릭 시 contenteditable의 선택 영역이 풀리지 않도록 막는다
    toolbar.addEventListener('mousedown', e => {
      if (e.target.closest('.rt-btn')) e.preventDefault();
    });

    toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        editable.focus();
        document.execCommand(btn.dataset.cmd, false, null);
        editable.dispatchEvent(new Event('input'));
      });
    });

    toolbar.querySelectorAll('[data-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        editable.focus();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
        const range = sel.getRangeAt(0);
        if (!editable.contains(range.commonAncestorContainer)) return;
        const existingSpan = closestColorSpan(range.commonAncestorContainer, btn.dataset.color, editable);
        if (existingSpan) {
          unwrapColorSpan(existingSpan, editable);
        } else {
          wrapSelectionWithClass(editable, btn.dataset.color);
        }
      });
    });

    const iconPicker = toolbar.querySelector('.rt-icon-picker');
    const iconMenu = toolbar.querySelector('.rt-icon-menu');
    iconPicker.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      iconMenu.classList.toggle('hidden');
    });
    iconMenu.querySelectorAll('.rt-icon-option').forEach(btn => {
      btn.addEventListener('click', () => {
        editable.focus();
        document.execCommand('insertHTML', false, `<span class="rt-icon">${iconHTML(btn.dataset.icon)}</span>&nbsp;`);
        icons();
        iconMenu.classList.add('hidden');
        editable.dispatchEvent(new Event('input'));
      });
    });

    toolbar.querySelector('[data-insert-image]').addEventListener('click', () => {
      const url = window.prompt('이미지 URL을 입력하세요');
      if (!url) return;
      const trimmed = url.trim();
      if (!trimmed || /^\s*javascript:/i.test(trimmed)) return;
      editable.focus();
      // src는 DOM 프로퍼티로 설정한 뒤 outerHTML로 꺼내서, 값 안에 따옴표 등이
      // 있어도 속성이 중간에 끊기지 않고 항상 안전하게 이스케이프되게 한다.
      const img = document.createElement('img');
      img.src = trimmed;
      img.alt = '';
      document.execCommand('insertHTML', false, img.outerHTML + '<div><br></div>');
      editable.dispatchEvent(new Event('input'));
    });

    toolbar.querySelector('[data-toggle-insert]').addEventListener('click', () => {
      editable.focus();
      document.execCommand('insertHTML', false, buildToggleHTML('제목', '내용', true) + '<div><br></div>');
      icons();
      editable.dispatchEvent(new Event('input'));
    });

    icons();
    return toolbar;
  }

  function buildSegmentBox(seg, index) {
    const box = document.createElement('div');
    box.className = 'segment-box';

    const typeIcon = seg.type === 'text' ? 'type' : (seg.type === 'reference' ? 'chevrons-right' : 'image');
    const typeLabel = seg.type === 'text' ? '텍스트' : (seg.type === 'reference' ? '레퍼런스 토글' : '이미지');

    const header = document.createElement('div');
    header.className = 'segment-box-header';
    header.innerHTML = `
      <span class="segment-type-label">
        <span class="segment-drag-handle" draggable="true" title="드래그해서 순서 바꾸기"><i data-lucide="grip-vertical"></i></span>
        <i data-lucide="${typeIcon}"></i>
        ${typeLabel}
      </span>
      <div class="segment-controls">
        <button type="button" class="seg-btn seg-remove" title="박스 삭제"><i data-lucide="trash-2"></i></button>
      </div>
    `;
    header.querySelector('.seg-remove').addEventListener('click', () => removeSegment(index));
    box.appendChild(header);
    attachSegmentDragHandlers(box, index);

    if (seg.type === 'text') {
      const editable = document.createElement('div');
      editable.className = 'segment-editable';
      editable.contentEditable = 'true';
      editable.dataset.placeholder = '설정, 메모, 디자인 노트 등을 자유롭게 적어주세요';
      editable.innerHTML = richTextEditHTML(seg.text || '');
      editable.addEventListener('input', () => { seg.text = editable.innerHTML; });
      editable.addEventListener('paste', e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });
      seg.text = editable.innerHTML;

      box.appendChild(buildRichTextToolbar(editable));
      box.appendChild(editable);
    } else if (seg.type === 'reference') {
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'reference-title-input';
      titleInput.placeholder = '토글 제목 (기본: 레퍼런스)';
      titleInput.value = seg.title || '';
      titleInput.addEventListener('input', () => { seg.title = titleInput.value; });
      box.appendChild(titleInput);

      const list = document.createElement('div');
      list.className = 'reference-manage-list';
      if (!seg.items.length) {
        list.innerHTML = `<p class="hint">아직 추가된 이미지가 없어요.</p>`;
      } else {
        seg.items.forEach(item => list.appendChild(buildReferenceItemRow(item, seg)));
      }
      box.appendChild(list);

      const addItemBtn = document.createElement('button');
      addItemBtn.type = 'button';
      addItemBtn.className = 'secondary-btn reference-add-item-btn';
      addItemBtn.innerHTML = `<i data-lucide="plus"></i> 이미지 추가`;
      addItemBtn.addEventListener('click', () => {
        seg.items.push({ id: uid(), url: '', comment: '' });
        renderSegmentList();
      });
      box.appendChild(addItemBtn);
    } else {
      const urlRow = document.createElement('div');
      urlRow.className = 'image-url-row';
      urlRow.innerHTML = `
        <input type="url" placeholder="이미지 주소(URL)를 붙여넣으세요">
        <button type="button" class="secondary-btn"><i data-lucide="plus"></i> 추가</button>
      `;
      const urlInput = urlRow.querySelector('input');
      const addBtn = urlRow.querySelector('button');
      const addFn = () => {
        const url = urlInput.value.trim();
        if (!url) return;
        seg.images.push({ id: uid(), url });
        renderSegmentList();
      };
      addBtn.addEventListener('click', addFn);
      urlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addFn(); }
      });
      box.appendChild(urlRow);

      const grid = document.createElement('div');
      grid.className = 'image-manage-grid';
      if (!seg.images.length) {
        grid.innerHTML = `<p class="hint">이 박스에 아직 이미지가 없어요. 여러 장을 넣으면 나란히 묶여요.</p>`;
      } else {
        seg.images.forEach(img => grid.appendChild(buildImageCell(img, seg)));
      }
      box.appendChild(grid);

      const commentInput = document.createElement('input');
      commentInput.type = 'text';
      commentInput.className = 'image-comment-input';
      commentInput.placeholder = '이미지 아래에 표시할 코멘트 (선택, 박스 전체에 하나)';
      commentInput.value = seg.comment || '';
      commentInput.addEventListener('input', () => { seg.comment = commentInput.value; });
      box.appendChild(commentInput);
    }

    return box;
  }

  function renderSegmentList() {
    editSegmentList.innerHTML = '';
    if (!workingSegments.length) {
      editSegmentList.innerHTML = `<p class="hint">아직 추가된 박스가 없어요. 아래 버튼으로 텍스트나 이미지를 추가해보세요.</p>`;
      icons();
      return;
    }
    workingSegments.forEach((seg, index) => {
      editSegmentList.appendChild(buildSegmentBox(seg, index));
    });
    icons();
  }

  editSaveBtn.addEventListener('click', async () => {
    const title = editTitleInput.value.trim();
    if (!title) {
      toast('제목을 입력해주세요.');
      editTitleInput.focus();
      return;
    }

    const blockId = currentBlockId;
    const subcategoryId = editSubcategorySelect.value;
    const existing = editingBlockId ? allBlocks.find(b => b.id === editingBlockId) : null;

    editSaveBtn.disabled = true;

    try {
      const segments = workingSegments
        .filter(seg => {
          if (seg.type === 'text') return !richTextIsEmpty(seg.text);
          if (seg.type === 'reference') return seg.items.some(it => it.url && it.url.trim());
          return seg.images.length;
        })
        .map(seg => {
          if (seg.type === 'text') return { type: 'text', id: seg.id, text: sanitizeRichHTML(seg.text || '') };
          if (seg.type === 'reference') {
            return {
              type: 'reference',
              id: seg.id,
              title: (seg.title || '').trim(),
              items: seg.items
                .filter(it => it.url && it.url.trim())
                .map(({ id, url, comment }) => ({ id, url: url.trim(), comment: (comment || '').trim() }))
            };
          }
          return {
            type: 'image',
            id: seg.id,
            images: seg.images.map(({ id, url }) => ({ id, url })),
            comment: (seg.comment || '').trim()
          };
        });

      const savedImageIds = segments.filter(s => s.type === 'image').flatMap(s => s.images.map(img => img.id));

      const block = {
        id: blockId,
        subcategoryId,
        title,
        segments,
        thumbnailIds: workingThumbnailIds.filter(id => savedImageIds.includes(id)),
        createdAt: existing ? existing.createdAt || Date.now() : Date.now(),
        updatedAt: Date.now()
      };

      await LookbookFirebase.saveBlock(block);

      selection = { categoryId: findCategoryBySub(subcategoryId).id, subcategoryId };
      editingBlockId = null;
      currentBlockId = null;
      workingSegments = [];
      workingThumbnailIds = [];
      editModal.classList.add('hidden');
      toast('저장했어요.');
    } catch (err) {
      console.error(err);
      toast('저장에 실패했어요. 네트워크를 확인해주세요.');
    } finally {
      editSaveBtn.disabled = false;
    }
  });

  // ---------- 모바일 사이드바 ----------
  const sidebar = $('#sidebar');
  const sidebarScrim = $('#sidebarScrim');
  $('#sidebarToggle').addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarScrim.classList.remove('hidden');
  });
  sidebarScrim.addEventListener('click', () => closeMobileSidebar());

  function closeMobileSidebar() {
    sidebar.classList.remove('open');
    sidebarScrim.classList.add('hidden');
  }

  // 키보드로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!imageLightbox.classList.contains('hidden')) closeImageLightbox();
    else if (!adminPasswordModal.classList.contains('hidden')) closeAdminPasswordModal();
    else if (!homeEditModal.classList.contains('hidden')) requestCloseHomeEditModal();
    else if (!editModal.classList.contains('hidden')) requestCloseEditModal();
    else if (!viewModal.classList.contains('hidden')) closeViewModal();
  });

  // ---------- 초기화 (Firebase 로그인 완료 후 시작) ----------
  window.addEventListener('firebase-ready', () => {
    icons();
    LookbookFirebase.subscribeBlocks(blocks => {
      allBlocks = blocks;
      renderSidebar();
      renderMain();
    });
    LookbookFirebase.subscribeHomeImages(items => {
      homeImages = items;
      if (currentView === 'home') renderHomeView();
    });
  });
})();
