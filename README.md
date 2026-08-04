# 슬룸 자사몰 교환·반품 리포트

올릿리테일 · 슬룸 · 아임웹(자사몰) 단독 기준 월간 교환·반품 대시보드.

## 구조
```
docs/
├── index.html          # 대시보드 셸
├── style.css           # 스타일
├── app.js              # JSON 렌더러
├── robots.txt          # 검색엔진 차단
└── data/
    ├── manifest.json   # 월 목록
    └── 2026-06.json    # 월별 집계
```

## 매월 갱신
1. 원본 RAW로 집계 → `docs/data/YYYY-MM.json` 생성
2. `docs/data/manifest.json`에 해당 월 추가
3. commit & push → GitHub Pages 자동 반영

원본 RAW(xlsx)는 개인정보를 포함하므로 `.gitignore`로 제외되며, 집계 수치만 저장됩니다.
