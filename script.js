(function () {
  "use strict";

  const copyItems = [
    { label: "Chrome 하드웨어 가속 확인", value: "chrome://settings/system" },
    { label: "Chrome GPU 상태 확인", value: "chrome://gpu" },
    { label: "Chrome 실행 파일 일반 경로", value: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
    { label: "Chrome 사용자별 설치 경로", value: "C:\\Users\\사용자이름\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe" }
  ];

  const diagnosticLabels = [
    ["browser", "브라우저 정보"],
    ["os", "운영체제 추정"],
    ["supportStatus", "WebGL 지원 상태"],
    ["webglVersion", "WebGL Version"],
    ["shadingLanguageVersion", "Shading Language Version"],
    ["vendor", "Vendor"],
    ["renderer", "Renderer"],
    ["unmaskedVendor", "Unmasked Vendor"],
    ["unmaskedRenderer", "Unmasked Renderer"],
    ["maxTextureSize", "Max Texture Size"],
    ["maxVertexTextureImageUnits", "Max Vertex Texture Image Units"],
    ["maxCombinedTextureImageUnits", "Max Combined Texture Image Units"]
  ];

  let benchmark = null;

  function detectBrowser() {
    const ua = navigator.userAgent || "";
    if (/Firefox\//.test(ua)) return "Firefox";
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
    if (/Edg\//.test(ua)) return "Chromium 계열 브라우저";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua)) return "Safari";
    return "알 수 없음";
  }

  function detectOS() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const source = `${ua} ${platform}`;

    if (/Android/i.test(source)) return "Android";
    if (/iPhone|iPad|iPod/i.test(source)) return "iOS";
    if (/Win/i.test(source)) return "Windows";
    if (/Mac/i.test(source)) return "macOS";
    if (/Linux/i.test(source)) return "Linux";
    return "알 수 없음";
  }

  function detectWebGLInfo() {
    const info = {
      browser: detectBrowser(),
      browserDetail: navigator.userAgent || "확인 불가",
      os: detectOS(),
      supportStatus: "WebGL 사용 불가",
      contextType: "none",
      webglVersion: "확인 불가",
      shadingLanguageVersion: "확인 불가",
      vendor: "확인 불가",
      renderer: "확인 불가",
      unmaskedVendor: "확인 불가",
      unmaskedRenderer: "확인 불가",
      maxTextureSize: "확인 불가",
      maxVertexTextureImageUnits: "확인 불가",
      maxCombinedTextureImageUnits: "확인 불가",
      error: ""
    };

    try {
      const canvas = document.createElement("canvas");
      const attributes = {
        alpha: false,
        antialias: false,
        failIfMajorPerformanceCaveat: false,
        powerPreference: "high-performance"
      };
      let gl = canvas.getContext("webgl2", attributes);

      if (gl) {
        info.contextType = "webgl2";
        info.supportStatus = "WebGL2 사용 가능";
      } else {
        gl = canvas.getContext("webgl", attributes) || canvas.getContext("experimental-webgl", attributes);
        if (gl) {
          info.contextType = "webgl1";
          info.supportStatus = "WebGL1만 사용 가능";
        }
      }

      if (!gl) return info;

      info.webglVersion = safeGetParameter(gl, gl.VERSION);
      info.shadingLanguageVersion = safeGetParameter(gl, gl.SHADING_LANGUAGE_VERSION);
      info.vendor = safeGetParameter(gl, gl.VENDOR);
      info.renderer = safeGetParameter(gl, gl.RENDERER);
      info.maxTextureSize = safeGetParameter(gl, gl.MAX_TEXTURE_SIZE);
      info.maxVertexTextureImageUnits = safeGetParameter(gl, gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
      info.maxCombinedTextureImageUnits = safeGetParameter(gl, gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        info.unmaskedVendor = safeGetParameter(gl, debugInfo.UNMASKED_VENDOR_WEBGL);
        info.unmaskedRenderer = safeGetParameter(gl, debugInfo.UNMASKED_RENDERER_WEBGL);
      } else {
        info.unmaskedVendor = "확장 사용 불가 또는 제한됨";
        info.unmaskedRenderer = "확장 사용 불가 또는 제한됨";
      }
    } catch (error) {
      info.error = error instanceof Error ? error.message : String(error);
    }

    return info;
  }

  function safeGetParameter(gl, parameter) {
    try {
      const value = gl.getParameter(parameter);
      if (value === null || value === undefined || value === "") return "확인 불가";
      return String(value);
    } catch (error) {
      return "확인 불가";
    }
  }

  function classifyGpuStatus(info) {
    if (info.contextType === "none") {
      return {
        type: "error",
        title: "WebGL 사용 불가",
        message: "이 브라우저에서 WebGL을 사용할 수 없습니다. 브라우저 그래픽 가속 설정, GPU 드라이버, 보안 정책 또는 원격 데스크톱 환경을 확인해 주세요."
      };
    }

    const rendererText = `${info.renderer} ${info.unmaskedRenderer} ${info.vendor} ${info.unmaskedVendor}`.toLowerCase();
    const highPerformancePattern = /(nvidia|amd|radeon|geforce|rtx|gtx|quadro|arc)/i;
    const checkNeededPattern = /(intel|uhd|iris|microsoft basic render driver|swiftshader|llvmpipe|software|warp)/i;
    const maskedPattern = /(확장 사용 불가|제한됨|확인 불가|mozilla|webkit webgl)/i;

    if (info.contextType === "webgl2" && highPerformancePattern.test(rendererText)) {
      return {
        type: "good",
        title: "정상",
        message: "현재 브라우저는 WebGL2와 고성능 GPU를 사용하고 있으며, 하드웨어 가속이 활성화되어 있습니다."
      };
    }

    if (checkNeededPattern.test(rendererText)) {
      return {
        type: "warning",
        title: "설정 확인 필요",
        message: "현재 브라우저가 내장 그래픽 또는 소프트웨어 렌더러를 사용 중일 수 있습니다. Windows 그래픽 설정에서 Chrome을 고성능 GPU로 지정하는 것을 권장합니다."
      };
    }

    if (maskedPattern.test(rendererText)) {
      return {
        type: "unknown",
        title: "알 수 없음",
        message: "브라우저 또는 개인정보 보호 설정 때문에 GPU 정보를 정확히 확인할 수 없습니다. 3D 성능이 낮다면 아래 설정을 확인해 주세요."
      };
    }

    return {
      type: "unknown",
      title: "알 수 없음",
      message: "브라우저 또는 개인정보 보호 설정 때문에 GPU 정보를 정확히 확인할 수 없습니다. 3D 성능이 낮다면 아래 설정을 확인해 주세요."
    };
  }

  function renderDiagnosticResult(info, status) {
    const result = document.getElementById("diagnosticResult");
    const setupAlert = document.getElementById("setupAlert");
    if (!result || !setupAlert) return;

    const icon = status.type === "good" ? "✓" : status.type === "error" ? "!" : "?";
    const rows = diagnosticLabels.map(([key, label]) => {
      const value = key === "browser" ? `${info.browser} (${info.browserDetail})` : info[key];
      return `
        <div class="info-item">
          <span class="info-label">${escapeHtml(label)}</span>
          <span class="info-value">${escapeHtml(value || "확인 불가")}</span>
        </div>
      `;
    }).join("");

    const errorMarkup = info.error
      ? `<div class="info-item"><span class="info-label">진단 중 오류</span><span class="info-value">${escapeHtml(info.error)}</span></div>`
      : "";

    result.innerHTML = `
      <div class="status-banner status-${escapeHtml(status.type)}">
        <span class="status-icon" aria-hidden="true">${icon}</span>
        <div>
          <h3>${escapeHtml(status.title)}</h3>
          <p>${escapeHtml(status.message)}</p>
        </div>
      </div>
      <div class="info-grid">
        ${rows}
        ${errorMarkup}
      </div>
    `;

    setupAlert.classList.toggle("hidden", !(status.type === "warning" || status.type === "error"));
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch (error) {
      return false;
    }
  }

  function renderCopyBoxes(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = items.map((item, index) => `
      <div class="copy-box">
        <label for="${containerId}-copy-${index}">${escapeHtml(item.label)}</label>
        <div class="copy-row">
          <code id="${containerId}-copy-${index}">${escapeHtml(item.value)}</code>
          <button class="button copy-button" type="button" data-copy="${escapeAttribute(item.value)}" aria-label="${escapeAttribute(item.label)} 복사">복사</button>
        </div>
      </div>
    `).join("");
  }

  function setupCopyButtons() {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-copy]");
      if (!button) return;

      const originalText = button.textContent;
      const copied = await copyToClipboard(button.getAttribute("data-copy") || "");
      button.textContent = copied ? "복사됨" : "실패";
      button.disabled = true;

      window.setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1400);
    });
  }

  function setupFaqAccordion() {
    const detailsItems = Array.from(document.querySelectorAll(".faq-list details"));
    detailsItems.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        detailsItems.forEach((other) => {
          if (other !== details) other.open = false;
        });
      });
    });
  }

  function setupBackToTop() {
    const button = document.getElementById("backToTop");
    if (!button) return;

    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", () => {
      button.classList.toggle("is-visible", window.scrollY > 500);
    }, { passive: true });
  }

  function setupBenchmark() {
    const canvas = document.getElementById("benchmarkCanvas");
    if (!canvas) return;

    const fallback = document.getElementById("benchmarkFallback");
    const fpsValue = document.getElementById("fpsValue");
    const primitiveValue = document.getElementById("primitiveValue");
    const primitiveMetricLabel = document.getElementById("primitiveMetricLabel");
    const primitiveRangeLabel = document.getElementById("primitiveRangeLabel");
    const benchmarkMode = document.getElementById("benchmarkMode");
    const primitiveCount = document.getElementById("primitiveCount");
    const startButton = document.getElementById("startBenchmark");
    const pauseButton = document.getElementById("pauseBenchmark");
    const resetButton = document.getElementById("resetBenchmark");
    const modeButtons = Array.from(document.querySelectorAll("[data-test-mode]"));

    const gl = canvas.getContext("webgl2", { antialias: false, powerPreference: "high-performance" })
      || canvas.getContext("webgl", { antialias: false, powerPreference: "high-performance" });

    if (!gl) {
      if (fallback) fallback.textContent = "WebGL을 사용할 수 없어 벤치마크를 실행할 수 없습니다.";
      if (benchmarkMode) benchmarkMode.textContent = "사용 불가";
      return;
    }

    benchmark = createBenchmarkRenderer(gl, canvas, {
      fallback,
      fpsValue,
      primitiveValue,
      primitiveMetricLabel,
      primitiveRangeLabel,
      benchmarkMode,
      primitiveCount
    });

    primitiveCount.addEventListener("input", () => {
      benchmark.setPrimitiveCount(Number(primitiveCount.value));
    });

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.getAttribute("data-test-mode") || "triangles";
        modeButtons.forEach((item) => {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        benchmark.setMode(mode);
      });
    });

    startButton.addEventListener("click", () => benchmark.start());
    pauseButton.addEventListener("click", () => benchmark.pause());
    resetButton.addEventListener("click", () => benchmark.reset());

    benchmark.setPrimitiveCount(Number(primitiveCount.value));
    benchmark.pause();
  }

  function createBenchmarkRenderer(gl, canvas, elements) {
    const vertexShaderSource = `
      precision mediump float;
      attribute vec3 a_position;
      attribute vec3 a_center;
      attribute vec2 a_velocity;
      attribute vec3 a_color;
      attribute float a_phase;
      uniform float u_time;
      uniform float u_mode;
      varying vec3 v_color;
      varying float v_phase;
      void main() {
        vec3 local = a_position;
        vec2 center = a_center.xy;

        if (u_mode > 0.5) {
          float angle = u_time * (0.7 + a_phase * 0.05) + a_phase;
          float ca = cos(angle);
          float sa = sin(angle);
          local.xy = vec2(local.x * ca - local.y * sa, local.x * sa + local.y * ca);
          local.xz = vec2(local.x * ca - local.z * sa, local.x * sa + local.z * ca);
          center = fract((a_center.xy + a_velocity * u_time) * 0.5 + 0.5) * 2.0 - 1.0;
          center *= 0.9;
        } else {
          float pulse = sin(u_time + a_phase) * 0.018;
          center = center + vec2(pulse, -pulse * 0.65);
        }

        float perspective = 1.0 / (1.0 + max(local.z, -0.05) * 1.4);
        vec2 pos = center + local.xy * perspective;
        gl_Position = vec4(pos, local.z * 0.05, 1.0);
        v_color = a_color;
        v_phase = a_phase;
      }
    `;
    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 v_color;
      varying float v_phase;
      uniform float u_time;
      void main() {
        vec3 color = v_color;
        float glow = 0.0;
        for (int i = 0; i < 6; i++) {
          float f = float(i) + 1.0;
          glow += abs(sin(u_time * f * 0.37 + v_phase * f)) * 0.035;
          color = mix(color, color.bgr, 0.045);
        }
        gl_FragColor = vec4(color + glow, 0.9);
      }
    `;

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    const buffer = gl.createBuffer();
    const stride = 12 * Float32Array.BYTES_PER_ELEMENT;
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const centerLocation = gl.getAttribLocation(program, "a_center");
    const velocityLocation = gl.getAttribLocation(program, "a_velocity");
    const colorLocation = gl.getAttribLocation(program, "a_color");
    const phaseLocation = gl.getAttribLocation(program, "a_phase");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const modeLocation = gl.getUniformLocation(program, "u_mode");

    let primitiveCount = 0;
    let vertexCount = 0;
    let mode = "triangles";
    let rafId = 0;
    let running = false;
    let lastFpsTime = performance.now();
    let frameCounter = 0;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(centerLocation);
    gl.vertexAttribPointer(centerLocation, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(velocityLocation);
    gl.vertexAttribPointer(velocityLocation, 2, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 8 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(phaseLocation);
    gl.vertexAttribPointer(phaseLocation, 1, gl.FLOAT, false, stride, 11 * Float32Array.BYTES_PER_ELEMENT);
    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.015, 0.027, 0.07, 1);

    if (elements.benchmarkMode) {
      elements.benchmarkMode.textContent = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext ? "WebGL2" : "WebGL1";
    }
    if (elements.fallback) {
      elements.fallback.textContent = "테스트를 선택하고 시작을 눌러 FPS 변화를 확인하세요.";
    }

    function setPrimitiveCount(nextCount) {
      const maximum = getMaximumCount();
      primitiveCount = Math.max(100, Math.min(maximum, Number(nextCount) || getDefaultCount()));
      const data = mode === "cubes" ? buildCubeData(primitiveCount) : mode === "drawcalls" ? buildDrawCallShapeData(primitiveCount) : buildTriangleData(primitiveCount);
      vertexCount = mode === "cubes" || mode === "drawcalls" ? primitiveCount * 36 : primitiveCount * 3;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      if (elements.primitiveValue) elements.primitiveValue.textContent = primitiveCount.toLocaleString("ko-KR");
    }

    function setMode(nextMode) {
      const wasRunning = running;
      pause();
      mode = nextMode === "cubes" || nextMode === "drawcalls" ? nextMode : "triangles";

      if (elements.primitiveCount) {
        elements.primitiveCount.max = String(getMaximumCount());
        elements.primitiveCount.step = mode === "drawcalls" ? "100" : mode === "cubes" ? "250" : "1000";
        elements.primitiveCount.value = String(getDefaultCount());
      }
      if (elements.primitiveMetricLabel) elements.primitiveMetricLabel.textContent = getModeLabel();
      if (elements.primitiveRangeLabel) elements.primitiveRangeLabel.textContent = `${getModeLabel()} 개수`;

      setPrimitiveCount(getDefaultCount());
      resetFps();
      drawFrame(performance.now());
      if (wasRunning) start();
    }

    function start() {
      if (running) return;
      running = true;
      lastFpsTime = performance.now();
      frameCounter = 0;
      rafId = requestAnimationFrame(render);
    }

    function pause() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    function reset() {
      pause();
      if (elements.primitiveCount) elements.primitiveCount.value = String(getDefaultCount());
      setPrimitiveCount(getDefaultCount());
      resetFps();
      drawFrame(performance.now());
    }

    function render(now) {
      if (!running) return;
      drawFrame(now);
      frameCounter += 1;

      if (now - lastFpsTime >= 500) {
        const displayedFps = Math.round((frameCounter * 1000) / (now - lastFpsTime));
        frameCounter = 0;
        lastFpsTime = now;
        if (elements.fpsValue) elements.fpsValue.textContent = String(displayedFps);
      }

      rafId = requestAnimationFrame(render);
    }

    function drawFrame(now) {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(timeLocation, now * 0.001);
      gl.uniform1f(modeLocation, mode === "cubes" ? 1 : 0);
      if (mode === "drawcalls") {
        for (let i = 0; i < primitiveCount; i += 1) {
          gl.drawArrays(gl.TRIANGLES, i * 36, 36);
        }
      } else {
        gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
      }
    }

    function getDefaultCount() {
      if (mode === "cubes") return 2000;
      if (mode === "drawcalls") return 1000;
      return 25000;
    }

    function getMaximumCount() {
      if (mode === "cubes") return 1200000;
      if (mode === "drawcalls") return 50000;
      return 2000000;
    }

    function getModeLabel() {
      if (mode === "cubes") return "큐브";
      if (mode === "drawcalls") return "Draw Call";
      return "삼각형";
    }

    function resetFps() {
      frameCounter = 0;
      lastFpsTime = performance.now();
      if (elements.fpsValue) elements.fpsValue.textContent = "0";
    }

    setMode("triangles");

    return { setPrimitiveCount, setMode, start, pause, reset };
  }

  function buildTriangleData(count) {
    const floatsPerVertex = 12;
    const data = new Float32Array(count * 3 * floatsPerVertex);
    let cursor = 0;

    for (let i = 0; i < count; i += 1) {
      const col = i % 80;
      const row = Math.floor(i / 80);
      const x = (col / 79) * 2 - 1;
      const y = ((row % 80) / 79) * 2 - 1;
      const size = 0.01 + ((i % 7) * 0.0024);
      const phase = (i % 360) * 0.01745;
      const r = 0.18 + ((i * 13) % 80) / 120;
      const g = 0.55 + ((i * 7) % 50) / 120;
      const b = 0.72 + ((i * 3) % 30) / 130;
      const points = [
        [0, size, 0],
        [-size * 0.86, -size, 0],
        [size * 0.86, -size, 0]
      ];

      for (const point of points) {
        data[cursor++] = point[0];
        data[cursor++] = point[1];
        data[cursor++] = point[2];
        data[cursor++] = x;
        data[cursor++] = y;
        data[cursor++] = 0;
        data[cursor++] = 0;
        data[cursor++] = 0;
        data[cursor++] = r;
        data[cursor++] = g;
        data[cursor++] = b;
        data[cursor++] = phase;
      }
    }

    return data;
  }

  function buildCubeData(count) {
    const floatsPerVertex = 12;
    const cubeVertices = [
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, -1, 1], [1, 1, 1], [-1, 1, 1],
      [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
      [-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, 1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, -1], [1, -1, 1], [-1, -1, 1],
      [1, -1, 1], [1, -1, -1], [1, 1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
      [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, -1, -1], [-1, 1, 1], [-1, 1, -1]
    ];
    const data = new Float32Array(count * cubeVertices.length * floatsPerVertex);
    let cursor = 0;

    for (let i = 0; i < count; i += 1) {
      const centerX = randomSigned(i * 17 + 3) * 0.92;
      const centerY = randomSigned(i * 29 + 7) * 0.82;
      const velocityX = (randomSigned(i * 43 + 11) * 0.32) || 0.12;
      const velocityY = (randomSigned(i * 59 + 13) * 0.24) || -0.1;
      const size = 0.012 + random01(i * 31 + 5) * 0.016;
      const phase = random01(i * 71 + 19) * 6.28318;
      const rgbMode = i % 3;
      const baseR = rgbMode === 0 ? 0.95 : 0.1 + random01(i * 23 + 1) * 0.16;
      const baseG = rgbMode === 1 ? 0.95 : 0.1 + random01(i * 37 + 2) * 0.16;
      const baseB = rgbMode === 2 ? 0.95 : 0.1 + random01(i * 41 + 4) * 0.16;

      for (let v = 0; v < cubeVertices.length; v += 1) {
        const point = cubeVertices[v];
        const shade = 0.72 + (v % 6) * 0.045;
        data[cursor++] = point[0] * size;
        data[cursor++] = point[1] * size;
        data[cursor++] = point[2] * size;
        data[cursor++] = centerX;
        data[cursor++] = centerY;
        data[cursor++] = 0;
        data[cursor++] = velocityX;
        data[cursor++] = velocityY;
        data[cursor++] = Math.min(1, baseR * shade);
        data[cursor++] = Math.min(1, baseG * shade);
        data[cursor++] = Math.min(1, baseB * shade);
        data[cursor++] = phase;
      }
    }

    return data;
  }

  function buildDrawCallShapeData(count) {
    const floatsPerVertex = 12;
    const shapeVertices = buildDrawCallShapeVertices();
    const data = new Float32Array(count * shapeVertices.length * floatsPerVertex);
    let cursor = 0;

    for (let i = 0; i < count; i += 1) {
      const col = i % 160;
      const row = Math.floor(i / 160);
      const centerX = (col / 159) * 1.92 - 0.96;
      const centerY = ((row % 160) / 159) * 1.72 - 0.86;
      const jitterX = randomSigned(i * 19 + 3) * 0.006;
      const jitterY = randomSigned(i * 23 + 7) * 0.006;
      const velocityX = randomSigned(i * 31 + 11) * 0.025;
      const velocityY = randomSigned(i * 43 + 13) * 0.018;
      const size = 0.012 + random01(i * 47 + 5) * 0.012;
      const phase = random01(i * 53 + 17) * 6.28318;
      const r = 0.72 + random01(i * 59 + 2) * 0.22;
      const g = 0.32 + random01(i * 61 + 4) * 0.28;
      const b = 0.74 + random01(i * 67 + 6) * 0.22;

      for (const vertex of shapeVertices) {
        data[cursor++] = vertex[0] * size;
        data[cursor++] = vertex[1] * size;
        data[cursor++] = vertex[2] * size;
        data[cursor++] = centerX + jitterX;
        data[cursor++] = centerY + jitterY;
        data[cursor++] = 0;
        data[cursor++] = velocityX;
        data[cursor++] = velocityY;
        data[cursor++] = r * vertex[3];
        data[cursor++] = g * vertex[3];
        data[cursor++] = b * vertex[3];
        data[cursor++] = phase;
      }
    }

    return data;
  }

  function buildDrawCallShapeVertices() {
    const quads = [
      [[0, 1.3, 0], [0.28, 0.28, 0], [0, 0, 0], [-0.28, 0.28, 0], 1.0],
      [[1.3, 0, 0], [0.28, -0.28, 0], [0, 0, 0], [0.28, 0.28, 0], 0.9],
      [[0, -1.3, 0], [-0.28, -0.28, 0], [0, 0, 0], [0.28, -0.28, 0], 0.82],
      [[-1.3, 0, 0], [-0.28, 0.28, 0], [0, 0, 0], [-0.28, -0.28, 0], 0.94],
      [[-0.5, 0.5, 0], [0, 0.22, 0], [0.5, 0.5, 0], [0, 0, 0], 0.78],
      [[0.5, -0.5, 0], [0, -0.22, 0], [-0.5, -0.5, 0], [0, 0, 0], 0.72]
    ];
    const vertices = [];

    for (const quad of quads) {
      const shade = quad[4];
      vertices.push([...quad[0], shade], [...quad[1], shade], [...quad[2], shade]);
      vertices.push([...quad[0], shade], [...quad[2], shade], [...quad[3], shade]);
    }

    return vertices;
  }

  function random01(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function randomSigned(seed) {
    return random01(seed) * 2 - 1;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "WebGL program link failed");
    }

    return program;
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "WebGL shader compile failed");
    }

    return shader;
  }

  function resizeCanvasToDisplaySize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
    const height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function runDiagnostic() {
    try {
      const info = detectWebGLInfo();
      const status = classifyGpuStatus(info);
      renderDiagnosticResult(info, status);
    } catch (error) {
      const fallbackInfo = {
        browser: detectBrowser(),
        browserDetail: navigator.userAgent || "확인 불가",
        os: detectOS(),
        supportStatus: "WebGL 사용 불가",
        contextType: "none",
        webglVersion: "확인 불가",
        shadingLanguageVersion: "확인 불가",
        vendor: "확인 불가",
        renderer: "확인 불가",
        unmaskedVendor: "확인 불가",
        unmaskedRenderer: "확인 불가",
        maxTextureSize: "확인 불가",
        maxVertexTextureImageUnits: "확인 불가",
        maxCombinedTextureImageUnits: "확인 불가",
        error: error instanceof Error ? error.message : String(error)
      };
      renderDiagnosticResult(fallbackInfo, classifyGpuStatus(fallbackInfo));
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderCopyBoxes("copyList", copyItems);
    renderCopyBoxes("quickCopyList", copyItems);
    setupCopyButtons();
    setupFaqAccordion();
    setupBackToTop();

    const rerunButton = document.getElementById("rerunDiagnostic");
    if (rerunButton) rerunButton.addEventListener("click", runDiagnostic);

    runDiagnostic();

    try {
      setupBenchmark();
    } catch (error) {
      const fallback = document.getElementById("benchmarkFallback");
      if (fallback) fallback.textContent = `벤치마크 초기화 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
    }
  });

  window.detectWebGLInfo = detectWebGLInfo;
  window.detectBrowser = detectBrowser;
  window.detectOS = detectOS;
  window.classifyGpuStatus = classifyGpuStatus;
  window.renderDiagnosticResult = renderDiagnosticResult;
  window.copyToClipboard = copyToClipboard;
})();
