# Chrome Browser GPU 하드웨어 가속 가이드

Windows 노트북 사용자가 Chrome에서 WebGL을 사용할 때 현재 브라우저의 WebGL/GPU 상태를 확인하고, 필요한 경우 고성능 GPU 설정 방법을 안내하는 GitHub Pages용 정적 페이지입니다.

## 로컬 실행 방법

별도 빌드 과정이 없습니다.

1. 저장소를 내려받습니다.
2. `index.html`을 Chrome에서 엽니다.
3. 실제 배포 환경과 비슷하게 확인하려면 간단한 정적 서버를 사용할 수 있습니다.

```bash
python -m http.server 8000
```

그 다음 Chrome에서 `http://localhost:8000`에 접속합니다.

## GitHub Pages 배포 방법

1. 이 저장소를 GitHub에 push합니다.
2. GitHub 저장소의 `Settings`로 이동합니다.
3. `Pages` 메뉴를 엽니다.
4. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
5. 배포 branch를 `main` 또는 사용하는 기본 branch로 선택합니다.
6. 폴더는 `/root`를 선택합니다.
7. 저장하면 GitHub Pages URL에서 바로 사용할 수 있습니다.

## 주요 기능

- 페이지 로드 시 자동 WebGL/GPU 진단
- `다시 검사` 버튼 제공
- WebGL2 우선 확인, 실패 시 WebGL1 확인
- 브라우저, 운영체제, WebGL 버전, 렌더러, 텍스처 제한값 표시
- NVIDIA GeForce/RTX, AMD Radeon 같은 외장 GPU 사용 가능성 안내
- Intel 내장 그래픽 또는 소프트웨어 렌더러 사용 가능성 안내
- FPS와 primitive 개수를 확인할 수 있는 간단한 WebGL 벤치마크
- 삼각형 렌더링 테스트와 화면 안에서 움직이는 큐브 테스트 제공
- 작은 primitive를 여러 번 호출하는 Draw Call 테스트 제공
- 삼각형 최대 2,000,000개, 큐브 최대 1,200,000개, Draw Call 최대 50,000회까지 단계적으로 부하 조절
- 벤치마크는 페이지 로드 시 자동 실행하지 않고 사용자가 `시작` 버튼을 눌러 실행
- Chrome 및 Windows 그래픽 설정 가이드
- `images` 폴더의 Windows 그래픽 설정 및 Chrome 그래픽 가속 화면 예시를 활용한 단계별 이미지 가이드
- `chrome://gpu` 등 복사 가능한 코드 박스
- 사용자 체크리스트
- FAQ 아코디언
- 맨 위로 이동 버튼
- 외부 라이브러리 없는 순수 HTML/CSS/JavaScript 구현

## WebGL 진단 정보 설명

- 브라우저 정보: `navigator.userAgent`를 기반으로 Chrome 또는 주요 브라우저 계열을 간단히 식별합니다.
- 운영체제 추정: user agent와 platform 정보를 바탕으로 Windows, macOS, Linux, Android, iOS 정도를 추정합니다.
- WebGL 지원 상태: WebGL2 컨텍스트를 먼저 만들고 실패하면 WebGL1 컨텍스트를 시도합니다.
- WebGL Version: `gl.getParameter(gl.VERSION)` 값입니다.
- Shading Language Version: `gl.getParameter(gl.SHADING_LANGUAGE_VERSION)` 값입니다.
- Vendor / Renderer: 브라우저가 노출하는 기본 WebGL vendor와 renderer 정보입니다.
- Unmasked Vendor / Renderer: `WEBGL_debug_renderer_info` 확장이 허용될 때 확인 가능한 실제 GPU 힌트입니다.
- Max Texture Size: 사용할 수 있는 최대 텍스처 크기입니다.
- Max Vertex Texture Image Units: vertex shader에서 사용할 수 있는 텍스처 유닛 수입니다.
- Max Combined Texture Image Units: 전체 shader 단계에서 사용할 수 있는 combined texture image unit 수입니다.

GPU 판정은 브라우저, 드라이버, 개인정보 보호 설정, 원격 데스크톱 환경에 따라 제한될 수 있습니다. 이 페이지는 문자열 기반으로 가능성을 안내하며 100% 정확한 하드웨어 판정을 보장하지 않습니다.

## 개인정보 안내

이 프로젝트는 정적 페이지이며 진단 정보를 서버로 전송하거나 저장하지 않습니다. 다만 브라우저/GPU 정보는 사용자의 실행 환경을 식별하는 단서가 될 수 있으므로 화면 캡처나 결과 공유 시 주의가 필요합니다.

## 라이선스

MIT
