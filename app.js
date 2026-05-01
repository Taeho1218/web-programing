(function () {
  let currentQuestionIndex = 0;
  let correctCount = 0;
  let skipCount = 0;
  let cameraActive = false;
  let cameraStream = null;
  let detectTimer = null;
  let holistic = null;
  let modelRecognizer = null;
  let useModel = false;
  let pendingAdvance = false;
  let selectedCategory = "전체";

  const $mainPage = $("#main-page");
  const $quizPage = $("#quiz-page");
  const $signGrid = $("#sign-grid");
  const $categoryFilters = $("#category-filters");
  const $searchInput = $("#search-input");
  const $feedback = $("#feedback-bar");
  const $videoModal = $("#video-modal");
  const $resultModal = $("#result-modal");
  const $learnVideo = $("#learn-video");

  const cameraVideo = document.getElementById("camera-video");
  const overlayCanvas = document.getElementById("overlay-canvas");
  const ctx = overlayCanvas ? overlayCanvas.getContext("2d") : null;

  const hasMainPage = $mainPage.length > 0;
  const hasQuizPage = $quizPage.length > 0;
  const SIGN_ALIASES = {
    사실: ["사실", "정말", "진짜", "참", "맞다", "정말로"],
  };

  function showPage(page) {
    $(".page").removeClass("active");
    page.addClass("active");
  }

  function setFeedback(text, type) {
    if (!$feedback.length) return;
    $feedback.removeClass("hidden info success error").addClass(type).text(text);
  }

  function clearFeedback() {
    if (!$feedback.length) return;
    $feedback.addClass("hidden").removeClass("info success error").text("");
  }

  function renderKeywords() {
    const html = APP_DATA.popularKeywords
      .map((keyword) => `<button class="keyword-btn" data-key="${keyword}">${keyword}</button>`)
      .join("");
    $("#popular-keywords").html(html);
  }

  function renderSignCards(keyword) {
    if (!$signGrid.length) return;
    const query = (keyword || "").trim();
    const list = APP_DATA.recommendedSigns.filter((item) => {
      const matchesKeyword = item.title.includes(query) || item.description.includes(query);
      const matchesCategory = selectedCategory === "전체" || item.category === selectedCategory;
      return matchesKeyword && matchesCategory;
    });
    const html = list
      .map(
        (item) => `
        <article class="sign-card" data-id="${item.id}">
          <div class="thumb">▶</div>
          <div class="card-body">
            <span class="category-chip">${item.category}</span>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
        </article>`
      )
      .join("");
    $signGrid.html(html || "<p>검색 결과가 없습니다.</p>");
  }

  function renderCategoryFilters() {
    if (!$categoryFilters.length) return;
    const categories = ["전체", ...APP_DATA.categories];
    const html = categories
      .map((category) => {
        const activeClass = selectedCategory === category ? "active" : "";
        return `<button class="category-btn ${activeClass}" data-category="${category}">${category}</button>`;
      })
      .join("");
    $categoryFilters.html(html);
  }

  function openLearnModal(signId) {
    if (!$videoModal.length || !$learnVideo.length) return;
    const sign = APP_DATA.recommendedSigns.find((item) => item.id === Number(signId));
    if (!sign) return;
    const isDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(sign.videoUrl || "");
    if (!isDirectVideo) {
      window.open(sign.videoUrl, "_blank", "noopener,noreferrer");
      return;
    }
    $("#modal-title").text(sign.title);
    $learnVideo.attr("src", sign.videoUrl);
    $videoModal.removeClass("hidden");
  }

  function closeLearnModal() {
    if (!$videoModal.length) return;
    $videoModal.addClass("hidden");
    const video = document.getElementById("learn-video");
    if (video) video.pause();
  }

  function renderQuestion() {
    if (!hasQuizPage) return;
    const q = APP_DATA.quizData[currentQuestionIndex];
    $("#question-meta").text(`문제 ${currentQuestionIndex + 1} / ${APP_DATA.quizData.length}`);
    $("#question-text").text(q.instruction);
    $("#question-letter").text(q.letter);
  }

  function normalizeSignText(text) {
    return (text || "").replace(/\s+/g, "").trim();
  }

  function isCorrectSign(detectedSign, targetSign) {
    const detected = normalizeSignText(detectedSign);
    const target = normalizeSignText(targetSign);
    if (!detected || !target || detected === "—") return false;
    const aliases = SIGN_ALIASES[targetSign] || [targetSign];
    return aliases.map(normalizeSignText).includes(detected);
  }

  function drawOverlay() {
    if (!overlayCanvas || !cameraVideo || !ctx) return;
    overlayCanvas.width = cameraVideo.videoWidth || 640;
    overlayCanvas.height = cameraVideo.videoHeight || 360;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }

  function drawRecognitionOverlay(results) {
    drawOverlay();
    if (!ctx) return;
    if (results?.leftHandLandmarks && typeof drawConnectors === "function" && typeof HAND_CONNECTIONS !== "undefined") {
      drawConnectors(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: "#4ade80", lineWidth: 2 });
      drawLandmarks(ctx, results.leftHandLandmarks, { color: "#bbf7d0", lineWidth: 1, radius: 2 });
    }
    if (results?.rightHandLandmarks && typeof drawConnectors === "function" && typeof HAND_CONNECTIONS !== "undefined") {
      drawConnectors(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: "#fb923c", lineWidth: 2 });
      drawLandmarks(ctx, results.rightHandLandmarks, { color: "#fed7aa", lineWidth: 1, radius: 2 });
    }
  }

  function handleHolisticResults(results) {
    if (!hasQuizPage) return;
    drawRecognitionOverlay(results);

    const baseResult = window.HandSignRecognizer?.guessDailyRuleFallback
      ? window.HandSignRecognizer.guessDailyRuleFallback(results)
      : { sign: "—", desc: "인식기 로드 실패", confidence: 0 };

    let finalResult = baseResult;
    if (useModel && modelRecognizer) {
      const modelResult = modelRecognizer.updateFromHolisticResults(results, baseResult);
      if (modelResult.source === "model") finalResult = modelResult;
    }

    const hasDetectedHand = !!(results?.leftHandLandmarks || results?.rightHandLandmarks);
    const currentQuestion = APP_DATA.quizData[currentQuestionIndex];
    const targetSign = currentQuestion?.letter || "";
    const isMatched = isCorrectSign(finalResult.sign, targetSign);

    if (hasDetectedHand) {
      $("#detect-status").removeClass("hidden").text(`인식: ${finalResult.sign || "—"}`);
    } else {
      $("#detect-status").addClass("hidden").text("손 감지됨 ✓");
    }

    if (isMatched && !pendingAdvance) {
      pendingAdvance = true;
      correctCount += 1;
      setFeedback(`정답 인식: '${finalResult.sign}'`, "success");
      setTimeout(function () {
        pendingAdvance = false;
        nextQuestion();
      }, 900);
    }
  }

  function nextQuestion() {
    pendingAdvance = false;
    clearFeedback();
    if (currentQuestionIndex < APP_DATA.quizData.length - 1) {
      currentQuestionIndex += 1;
      renderQuestion();
      return;
    }
    showResultModal();
  }

  function showResultModal() {
    if (!$resultModal.length) return;
    shutdownCameraIfNeeded();
    const total = APP_DATA.quizData.length;
    const rate = Math.round((correctCount / total) * 100);
    $("#result-correct").text(`맞춘 문제: ${correctCount}`);
    $("#result-skip").text(`넘어간 문제: ${skipCount}`);
    $("#result-rate").text(`정답률: ${rate}%`);
    $resultModal.removeClass("hidden");
  }

  function restartQuiz() {
    if (!hasQuizPage) return;
    currentQuestionIndex = 0;
    correctCount = 0;
    skipCount = 0;
    pendingAdvance = false;
    if (modelRecognizer) modelRecognizer.reset();
    renderQuestion();
    clearFeedback();
    $resultModal.addClass("hidden");
  }

  async function toggleCamera() {
    if (!cameraVideo || !overlayCanvas || !ctx) return;
    const $btn = $("#toggle-camera-btn");
    const $cameraStatus = $("#camera-status");
    const $detect = $("#detect-status");

    if (!cameraActive) {
      try {
        if (!window.Holistic || !window.HandSignRecognizer) {
          throw new Error("인식 라이브러리가 로드되지 않았습니다.");
        }

        if (!modelRecognizer && window.HandSignRecognizer.createRepoTfjsRecognizer) {
          modelRecognizer = window.HandSignRecognizer.createRepoTfjsRecognizer({
            modelUrl: "../test/models/web_model/model.json",
            labelsUrl: "../test/models/web_model/labels.json",
            sequenceSize: 50,
            featureDim: 258,
            minConfidence: 0.75,
          });
        }
        if (modelRecognizer) {
          useModel = await modelRecognizer.init();
          modelRecognizer.reset();
        }

        holistic = new window.Holistic({
          locateFile: function (file) {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
          },
        });
        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: true,
          refineFaceLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        holistic.onResults(handleHolisticResults);

        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraVideo.srcObject = cameraStream;
        await cameraVideo.play();
        cameraActive = true;
        pendingAdvance = false;
        $btn.text("카메라 끄기").addClass("off");
        $cameraStatus.addClass("hidden");
        setFeedback(useModel ? "카메라+모델 인식 활성화" : "카메라+규칙 인식 활성화", "info");

        detectTimer = setInterval(async function () {
          if (!cameraActive || !holistic) return;
          if (cameraVideo.readyState < 2) return;
          await holistic.send({ image: cameraVideo });
        }, 120);
      } catch (error) {
        setFeedback(`카메라 시작 실패: ${error.message}`, "error");
      }
      return;
    }

    cameraActive = false;
    $btn.text("카메라 켜기").removeClass("off");
    $cameraStatus.removeClass("hidden");
    $detect.addClass("hidden");
    $detect.text("손 감지됨 ✓");
    setFeedback("카메라가 비활성화되었습니다.", "info");
    if (detectTimer) clearInterval(detectTimer);
    detectTimer = null;
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    if (holistic) {
      holistic.close();
      holistic = null;
    }
    if (modelRecognizer) modelRecognizer.reset();
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }

  function shutdownCameraIfNeeded() {
    if (!cameraActive) return;
    cameraActive = false;
    if (detectTimer) clearInterval(detectTimer);
    detectTimer = null;
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    if (holistic) {
      holistic.close();
      holistic = null;
    }
    if (modelRecognizer) modelRecognizer.reset();
    if (ctx && overlayCanvas) {
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    $("#camera-status").removeClass("hidden");
    $("#detect-status").addClass("hidden").text("손 감지됨 ✓");
    $("#toggle-camera-btn").text("카메라 켜기").removeClass("off");
  }

  function bindEvents() {
    if (hasMainPage) {
      $("#search-form").on("submit", function (event) {
        event.preventDefault();
        renderSignCards($searchInput.val());
      });

      $(document).on("click", ".keyword-btn", function () {
        const keyword = $(this).data("key");
        $searchInput.val(keyword);
        renderSignCards(keyword);
      });

      $(document).on("click", ".category-btn", function () {
        selectedCategory = $(this).data("category");
        renderCategoryFilters();
        renderSignCards($searchInput.val());
      });

      $(document).on("click", ".sign-card", function () {
        openLearnModal($(this).data("id"));
      });

      $("#close-modal-btn").on("click", closeLearnModal);
      $videoModal.on("click", function (event) {
        if (event.target.id === "video-modal") closeLearnModal();
      });

      $("#start-quiz-btn").on("click", function () {
        window.location.href = "./quiz.html";
      });
    }

    if (hasQuizPage) {
      $("#back-main-btn, #go-main-btn").on("click", function () {
        shutdownCameraIfNeeded();
        window.location.href = "./index.html";
      });

      $("#toggle-camera-btn").on("click", toggleCamera);
      $("#skip-btn").on("click", function () {
        pendingAdvance = false;
        skipCount += 1;
        setFeedback("문제를 건너뛰었습니다.", "info");
        setTimeout(nextQuestion, 600);
      });

      $("#hint-btn").on("click", function () {
        setFeedback("지시문을 다시 확인하고, 카메라에 손이 잘 보이게 해보세요.", "info");
      });

      $("#restart-btn").on("click", restartQuiz);
    }
  }

  function initPlugin() {
    if (!$searchInput.length) return;
    $searchInput.autocomplete({
      source: APP_DATA.recommendedSigns.map((item) => item.title)
    });
  }

  function init() {
    if (hasMainPage) {
      renderKeywords();
      renderCategoryFilters();
      renderSignCards("");
    }
    if (hasQuizPage) {
      renderQuestion();
      clearFeedback();
    }
    bindEvents();
    initPlugin();
  }

  init();
})();
