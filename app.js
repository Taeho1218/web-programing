(function () {
  let currentQuestionIndex = 0;
  let correctCount = 0;
  let skipCount = 0;
  let cameraActive = false;
  let cameraStream = null;
  let detectTimer = null;

  const $mainPage = $("#main-page");
  const $quizPage = $("#quiz-page");
  const $signGrid = $("#sign-grid");
  const $searchInput = $("#search-input");
  const $feedback = $("#feedback-bar");
  const $videoModal = $("#video-modal");
  const $resultModal = $("#result-modal");
  const $learnVideo = $("#learn-video");

  const cameraVideo = document.getElementById("camera-video");
  const overlayCanvas = document.getElementById("overlay-canvas");
  const ctx = overlayCanvas.getContext("2d");

  function showPage(page) {
    $(".page").removeClass("active");
    page.addClass("active");
  }

  function setFeedback(text, type) {
    $feedback.removeClass("hidden info success error").addClass(type).text(text);
  }

  function clearFeedback() {
    $feedback.addClass("hidden").removeClass("info success error").text("");
  }

  function renderKeywords() {
    const html = APP_DATA.popularKeywords
      .map((keyword) => `<button class="keyword-btn" data-key="${keyword}">${keyword}</button>`)
      .join("");
    $("#popular-keywords").html(html);
  }

  function renderSignCards(keyword) {
    const query = (keyword || "").trim();
    const list = APP_DATA.recommendedSigns.filter((item) => item.title.includes(query) || item.description.includes(query));
    const html = list
      .map(
        (item) => `
        <article class="sign-card" data-id="${item.id}">
          <div class="thumb">▶</div>
          <div class="card-body">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
        </article>`
      )
      .join("");
    $signGrid.html(html || "<p>검색 결과가 없습니다.</p>");
  }

  function openLearnModal(signId) {
    const sign = APP_DATA.recommendedSigns.find((item) => item.id === Number(signId));
    if (!sign) return;
    $("#modal-title").text(sign.title);
    $learnVideo.attr("src", sign.videoUrl);
    $videoModal.removeClass("hidden");
  }

  function closeLearnModal() {
    $videoModal.addClass("hidden");
    const video = document.getElementById("learn-video");
    video.pause();
  }

  function renderQuestion() {
    const q = APP_DATA.quizData[currentQuestionIndex];
    $("#question-meta").text(`문제 ${currentQuestionIndex + 1} / ${APP_DATA.quizData.length}`);
    $("#question-text").text(q.instruction);
    $("#question-letter").text(q.letter);
  }

  function drawOverlay() {
    overlayCanvas.width = cameraVideo.videoWidth || 640;
    overlayCanvas.height = cameraVideo.videoHeight || 360;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 3;
    ctx.strokeRect(overlayCanvas.width * 0.25, overlayCanvas.height * 0.2, overlayCanvas.width * 0.5, overlayCanvas.height * 0.6);
  }

  function nextQuestion() {
    clearFeedback();
    if (currentQuestionIndex < APP_DATA.quizData.length - 1) {
      currentQuestionIndex += 1;
      renderQuestion();
      return;
    }
    showResultModal();
  }

  function showResultModal() {
    const total = APP_DATA.quizData.length;
    const rate = Math.round((correctCount / total) * 100);
    $("#result-correct").text(`맞춘 문제: ${correctCount}`);
    $("#result-skip").text(`넘어간 문제: ${skipCount}`);
    $("#result-rate").text(`정답률: ${rate}%`);
    $resultModal.removeClass("hidden");
  }

  function restartQuiz() {
    currentQuestionIndex = 0;
    correctCount = 0;
    skipCount = 0;
    renderQuestion();
    clearFeedback();
    $resultModal.addClass("hidden");
  }

  async function toggleCamera() {
    const $btn = $("#toggle-camera-btn");
    const $cameraStatus = $("#camera-status");
    const $detect = $("#detect-status");

    if (!cameraActive) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraVideo.srcObject = cameraStream;
        cameraActive = true;
        $btn.text("카메라 끄기").addClass("off");
        $cameraStatus.addClass("hidden");
        setFeedback("카메라가 활성화되었습니다.", "info");

        detectTimer = setInterval(function () {
          const detected = Math.random() > 0.45;
          if (detected) {
            $detect.removeClass("hidden");
            drawOverlay();
            if (Math.random() > 0.87) {
              correctCount += 1;
              setFeedback("정답입니다! 다음 문제로 이동합니다.", "success");
              setTimeout(nextQuestion, 800);
            }
          } else {
            $detect.addClass("hidden");
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          }
        }, 900);
      } catch (error) {
        setFeedback("카메라 권한이 필요합니다.", "error");
      }
      return;
    }

    cameraActive = false;
    $btn.text("카메라 켜기").removeClass("off");
    $cameraStatus.removeClass("hidden");
    $detect.addClass("hidden");
    setFeedback("카메라가 비활성화되었습니다.", "info");
    if (detectTimer) clearInterval(detectTimer);
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }

  function bindEvents() {
    $("#search-form").on("submit", function (event) {
      event.preventDefault();
      renderSignCards($searchInput.val());
    });

    $(document).on("click", ".keyword-btn", function () {
      const keyword = $(this).data("key");
      $searchInput.val(keyword);
      renderSignCards(keyword);
    });

    $(document).on("click", ".sign-card", function () {
      openLearnModal($(this).data("id"));
    });

    $("#close-modal-btn").on("click", closeLearnModal);
    $videoModal.on("click", function (event) {
      if (event.target.id === "video-modal") closeLearnModal();
    });

    $("#start-quiz-btn").on("click", function () {
      showPage($quizPage);
      renderQuestion();
      clearFeedback();
    });

    $("#back-main-btn, #go-main-btn").on("click", function () {
      showPage($mainPage);
      $resultModal.addClass("hidden");
    });

    $("#toggle-camera-btn").on("click", toggleCamera);
    $("#skip-btn").on("click", function () {
      skipCount += 1;
      setFeedback("문제를 건너뛰었습니다.", "info");
      setTimeout(nextQuestion, 600);
    });

    $("#hint-btn").on("click", function () {
      setFeedback("지시문을 다시 확인하고, 카메라에 손이 잘 보이게 해보세요.", "info");
    });

    $("#restart-btn").on("click", restartQuiz);
  }

  function initPlugin() {
    $searchInput.autocomplete({
      source: APP_DATA.recommendedSigns.map((item) => item.title)
    });
  }

  function init() {
    renderKeywords();
    renderSignCards("");
    bindEvents();
    initPlugin();
  }

  init();
})();
