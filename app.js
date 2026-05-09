let selectedCategory = "전체";

const $signGrid = $("#sign-grid");
const $categoryFilters = $("#category-filters");
const $searchForm = $("#search-form");
const $searchInput = $("#search-input");

function renderCategories() {
  const categories = ["전체", ...APP_DATA.categories];

  const html = categories
    .map(
      (category) => `
        <button
          class="category-btn ${category === selectedCategory ? "active" : ""}"
          data-category="${category}">
          ${category}
        </button>
      `
    )
    .join("");

  $categoryFilters.html(html);
}

function renderSignCards(keyword = "") {
  const query = keyword.trim();

  const list = APP_DATA.recommendedSigns.filter((item) => {
    const matchesKeyword =
      item.title.includes(query) || item.description.includes(query);

    const matchesCategory =
      selectedCategory === "전체" || item.category === selectedCategory;

    return matchesKeyword && matchesCategory;
  });

  const html = list
    .map(
      (item) => `
        <article class="sign-card" data-id="${item.id}">
          <div class="thumb">
            <video class="thumb-video" muted preload="metadata">
              <source src="${item.videoUrl}" type="video/webm">
            </video>

            <div class="thumb-play">▶</div>
          </div>

          <div class="card-body">
            <span class="category-chip">${item.category}</span>
            <h3>${item.title}</h3>
            <p>${item.description}</p>

            <button class="video-link" type="button" data-id="${item.id}">
              영상 보기
            </button>
          </div>
        </article>
      `
    )
    .join("");

  $signGrid.html(html || `<p class="empty-message">검색 결과가 없습니다.</p>`);
}

function openLearnModal(id) {
  const item = APP_DATA.recommendedSigns.find((sign) => sign.id == id);

  if (!item) return;

  $("#modal-title").text(item.title);

  const video = $("#learn-video")[0];
  video.pause();
  video.innerHTML = `<source src="${item.videoUrl}" type="video/webm">`;
  video.load();

  $("#video-modal").removeClass("hidden");
}

$(document).on("click", ".category-btn", function () {
  selectedCategory = $(this).data("category");

  renderCategories();
  renderSignCards($searchInput.val());
});

$searchForm.on("submit", function (e) {
  e.preventDefault();
  renderSignCards($searchInput.val());
});

$(document).on("click", ".sign-card", function () {
  openLearnModal($(this).data("id"));
});

$(document).on("click", ".video-link", function (event) {
  event.stopPropagation();
  openLearnModal($(this).data("id"));
});

$("#close-modal-btn").on("click", function () {
  $("#video-modal").addClass("hidden");

  const video = $("#learn-video")[0];
  video.pause();
  video.currentTime = 0;
});

$("#video-modal").on("click", function (event) {
  if (event.target.id === "video-modal") {
    $("#close-modal-btn").click();
  }
});

renderCategories();
renderSignCards();