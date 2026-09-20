// 1차/2차 카테고리 정의. id는 고정 문자열로, 나중에 카테고리 이름이 바뀌어도
// 저장된 카드와의 연결이 끊어지지 않도록 한다.
const CATEGORIES = [
  {
    id: 'jung-yun',
    name: '中ゆん',
    icon: 'ferris-wheel',
    subs: [
      { id: 'jung-yun-jakjung', name: '작중' },
      { id: 'jung-yun-planning', name: '기획 일러스트 : 애니' },
      { id: 'jung-yun-planning-original', name: '기획 일러스트 : 원작' },
      { id: 'jung-yun-bunmayo', name: '분마요' }
    ]
  },
  {
    id: 'hyun-gaeul',
    name: '현가을',
    icon: 'mail',
    subs: [
      { id: 'hyun-gaeul-jakjung', name: '작중' },
      { id: 'hyun-gaeul-illust', name: '일러스트' }
    ]
  },
  {
    id: 'yeongseok',
    name: '影夕',
    icon: 'volleyball',
    subs: [
      { id: 'yeongseok-jakjung', name: '작중' },
      { id: 'yeongseok-illust', name: '일러스트' },
      { id: 'yeongseok-special', name: 'Special' }
    ]
  },
  {
    id: 'ghimer',
    name: 'GhiMer',
    icon: 'butterfly', // lucide에 없어서 직접 그린 커스텀 아이콘 (app.js의 CUSTOM_ICONS 참고)
    subs: [
      { id: 'ghimer-part1', name: '전편' },
      { id: 'ghimer-part2', name: '후편' },
      { id: 'ghimer-epilogue', name: '에필로그' }
    ]
  },
  {
    id: 'sirene',
    name: 'Sirené',
    icon: 'star',
    subs: [
      { id: 'sirene-main', name: '메인 스토리' },
      { id: 'sirene-event', name: '이벤트' },
      { id: 'sirene-special', name: 'Special' }
    ]
  },
  {
    id: 'samryeon',
    name: '三蓮 / 대만하리',
    icon: 'basketball', // lucide에 없어서 직접 그린 커스텀 아이콘 (app.js의 CUSTOM_ICONS 참고)
    subs: [
      { id: 'samryeon-jakjung', name: '작중' },
      { id: 'samryeon-special', name: 'Special' }
    ]
  }
];

function findCategoryBySub(subId) {
  return CATEGORIES.find(cat => cat.subs.some(s => s.id === subId));
}

function findSub(subId) {
  const cat = findCategoryBySub(subId);
  if (!cat) return null;
  return cat.subs.find(s => s.id === subId);
}

// 관리자 전용 "To Do" 카테고리. CATEGORIES 배열에는 넣지 않는다 — 이 2차
// 카테고리들은 실제 카드를 담는 곳이 아니라, 같은 순번의 CATEGORIES 항목과
// 매칭되어 그 카테고리의 카드를 표 형태로 모아 보여주는 별도 화면을 여는
// 용도라서, 카드 배정 드롭다운/검색 등 CATEGORIES를 도는 다른 로직에 섞이면
// 안 된다. subs 순서가 CATEGORIES 배열 순서와 1:1로 대응한다(i번째 <-> i번째).
const TODO_CATEGORY = {
  id: 'todo',
  name: 'To Do',
  icon: 'list-todo', // 아이콘은 나중에 원하는 걸로 교체하면 됨
  subs: [
    { id: 'todo-jung-yun', name: '珠雪ゆん' },
    { id: 'todo-hyun-gaeul', name: '윤가을' },
    { id: 'todo-yeongseok', name: '樹跡夕' },
    { id: 'todo-ghimer', name: 'Mer Danika' },
    { id: 'todo-sirene', name: 'René' },
    { id: 'todo-samryeon', name: '鳥飼蓮 / 윤하리' }
  ]
};

// To Do 2차 카테고리 하나를 받아, 순번이 매칭되는 실제(CATEGORIES) 1차
// 카테고리를 돌려준다.
function todoMatchedCategory(todoSubId) {
  const idx = TODO_CATEGORY.subs.findIndex(s => s.id === todoSubId);
  return idx > -1 ? CATEGORIES[idx] : null;
}
