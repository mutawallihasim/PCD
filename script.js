const NIM_MAHASISWA = "241011093"; 
let histogramChartObj = null;
let outputZoom = 1;
let outputRotation = 0;
let selectedSE = 'cross';
let activeMenu = null;

// Memantau status kesiapan pustaka OpenCV.js
document.getElementById('opencv-js').addEventListener('load', () => {
    let statusEl = document.getElementById('opencv-status');
    statusEl.innerText = "OpenCV.js Ready";
    statusEl.style.color = "var(--accent-green)";
    statusEl.style.background = "#f0fdf4";
    initEmptyChart();
});

// Menampilkan dimensi resolusi gambar pada header panel
// FUNGSI UPDATE DIMENSI: Sudah dibersihkan dari teks otomatis pada citra 1 dan 2
function updateDimensionUI() {
    let img1 = document.getElementById('inputImg');
    let img2 = document.getElementById('secondaryInputImg');
    let inputHeader = document.querySelector('.panel-header.input');
    
    // 1. Membersihkan informasi dimensi pada Citra Utama (Citra 1)
    let infoText = "Citra Utama (Source Input)";
    inputHeader.innerText = infoText;

    // 2. Membersihkan informasi dimensi pada Preview Citra Ke-2 (Citra 2)
    let panelPreviewText = document.getElementById('panelPreviewText');
    if (panelPreviewText) {
        if (img2.src && img2.src !== window.location.href && img2.src !== "") {
            // Jika gambar ada, sembunyikan teks panduan sepenuhnya agar ruang preview bersih
            panelPreviewText.style.display = "none";
        } else {
            // Jika kosong, tetap tampilkan instruksi awal saja
            panelPreviewText.innerText = "Belum ada citra ke-2 dimuat";
            panelPreviewText.style.display = "block";
        }
    }
}

// Mengatur status loading pada tombol operasi aktif
function setLoadingState(isLoading) {
    let applyBtn = document.querySelector('.apply-btn');
    if (!applyBtn) return;

    if (isLoading) {
        applyBtn.disabled = true;
        applyBtn.style.opacity = "0.7";
        applyBtn.style.cursor = "not-allowed";
        applyBtn.innerHTML = `<span>⏳</span> Memproses Matriks...`;
    } else {
        setTimeout(() => {
            applyBtn.disabled = false;
            applyBtn.style.opacity = "1";
            applyBtn.style.cursor = "pointer";
            
            if (activeMenu === 'arithmetic') applyBtn.innerHTML = `▶ &nbsp;Terapkan Kombinasi`;
            else if (activeMenu === 'logic') applyBtn.innerHTML = `▶ &nbsp;Terapkan Logika`;
            else if (activeMenu === 'grayscale') applyBtn.innerHTML = `▶ &nbsp;Terapkan Grayscale`;
            else if (activeMenu === 'binary') applyBtn.innerHTML = `▶ &nbsp;Terapkan Citra Biner`;
            else if (activeMenu === 'convolution') applyBtn.innerHTML = `▶ &nbsp;Terapkan Filter`;
            else if (activeMenu === 'morphology') applyBtn.innerHTML = `▶ &nbsp;Terapkan Morfologi`;
        }, 200); 
    }
}

// Handlers Pengunggahan Gambar Utama
function loadUtama(event) {
    let reader = new FileReader();
    reader.onload = function() {
        let img = document.getElementById('inputImg');
        img.src = reader.result;
        img.style.display = "block";
        img.onload = function() {
            updateHistogramChart(img);
            updateDimensionUI(); 
        }
    }
    if(event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

// Handlers Pengunggahan Gambar Kedua
function loadSekunder(event) {
    let reader = new FileReader();
    reader.onload = function() {
        let imgCache = document.getElementById('secondaryInputImg');
        imgCache.src = reader.result;
        
        imgCache.onload = function() {
            alert("Citra sekunder berhasil disimpan di cache sistem!");
            
            let panelPreview = document.getElementById('panelPreviewImg');
            let panelText = document.getElementById('panelPreviewText');
            
            if (panelPreview) {
                panelPreview.src = reader.result;
                panelPreview.style.display = "block";
                if (panelText) panelText.style.display = "none"; // Menyembunyikan teks panduan
            }
            updateDimensionUI(); 
        }
    }
    if(event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

// PANEL OPERASI DINAMIS KANAN 
function selectMenu(menuType) {
    activeMenu = menuType;
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`menu-${menuType}`);
    if(targetBtn) targetBtn.classList.add('active');

    const panel = document.getElementById('rightPanel');
    const title = document.getElementById('panelTitle');
    const content = document.getElementById('panelContent');
    panel.classList.add('visible');

    let currentSecondSrc = document.getElementById('secondaryInputImg').src;
    let hasImg = (currentSecondSrc && currentSecondSrc !== window.location.href && currentSecondSrc !== "");

    if (menuType === 'grayscale') {
        title.innerText = "Grayscale";
        content.innerHTML = `
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.5;">Mengonversi citra RGB menjadi matriks keabuan menggunakan formula Luminance standar (0.299R + 0.587G + 0.114B).</p>
            <button class="apply-btn blue" onclick="prosesGrayscale()">▶ &nbsp;Terapkan Grayscale</button>`;
    } 
    else if (menuType === 'binary') {
        title.innerText = "Citra Biner";
        content.innerHTML = `
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.5;">Membuat citra hitam-putih tegas menggunakan batas ambang statis nilai tengah.</p>
            <button class="apply-btn blue" onclick="konversiCitraBiner('statis')">▶ &nbsp;Terapkan Citra Biner</button>`;
    } 
    else if (menuType === 'arithmetic') {
        title.innerText = "Operasi Aritmatika";
        content.innerHTML = `
            <div class="field-row" style="margin-bottom: 10px;">
                <span class="field-label">Operasi</span>
                <select class="select-input" id="arithOp" onchange="toggleArithmeticUI()">
                    <option value="add">Penjumlahan Citra (+)</option>
                    <option value="subtract">Pengurangan Citra (-)</option>
                    <option value="blend">Perpaduan (Blending/Intensitas)</option>
                </select>
            </div>
            
            <div class="field-row" id="row-scalar-val" style="margin-bottom: 10px;">
                <span class="field-label">Intensitas (Skalar)</span>
                <div class="number-input-wrap">
                    <input type="number" id="arithVal" value="50" min="0" max="255">
                </div>
            </div>

            <div class="field-row" id="row-blend-slider" style="margin-bottom: 10px; display: none;">
                <span class="field-label">Bobot Citra 1</span>
                <input type="range" id="blendAlpha" min="0" max="100" value="50" style="flex: 1;" oninput="document.getElementById('lblAlpha').innerText = (this.value/100).toFixed(2)">
                <span id="lblAlpha" style="font-size: 12px; font-weight: 600; min-width: 30px; text-align: right;">0.50</span>
            </div>

            <div class="field-label" style="margin-top: 10px; margin-bottom: 2px;">Preview Citra Ke-2</div>
            <div class="panel-preview-box">
                <span id="panelPreviewText" style="${hasImg ? 'display:none;' : ''}" class="panel-preview-text">Belum ada citra ke-2 dimuat</span>
                <img id="panelPreviewImg" src="${hasImg ? currentSecondSrc : ''}" style="${hasImg ? 'display:block;' : 'display:none;'}" alt="Preview Gambar 2">
            </div>
            
            <div class="file-input-wrapper" style="margin-bottom: 12px; margin-top: 4px;">
                <button class="btn-upload" style="background-color: var(--accent-purple); font-size:12px; padding:8px;">🖼 Muat Citra Ke-2</button>
                <input type="file" id="panelFileArith" accept="image/*" onchange="loadSekunder(event)" />
            </div>
            
            <button class="apply-btn orange" onclick="operasiAritmatika()">▶ &nbsp;Terapkan Kombinasi</button>`;
            
        toggleArithmeticUI();
        updateDimensionUI();
    } 

    else if (menuType === 'logic') {
        title.innerText = "Operasi Logika";
        content.innerHTML = `
            <div class="field-row" style="margin-bottom: 10px;">
                <span class="field-label">Operasi</span>
                <div class="radio-group">
                    <label class="radio-option"><input type="radio" name="logicOp" value="and" checked> AND</label>
                    <label class="radio-option"><input type="radio" name="logicOp" value="or"> OR</label>
                    <label class="radio-option"><input type="radio" name="logicOp" value="not"> NOT</label>
                    <label class="radio-option"><input type="radio" name="logicOp" value="xor"> XOR</label> </div>
            </div>

            <div class="field-label" style="margin-top: 10px; margin-bottom: 2px;">Preview Citra Ke-2</div>
            <div class="panel-preview-box">
                <span id="panelPreviewText" style="${hasImg ? 'display:none;' : ''}" class="panel-preview-text">Belum ada citra ke-2 dimuat</span>
                <img id="panelPreviewImg" src="${hasImg ? currentSecondSrc : ''}" style="${hasImg ? 'display:block;' : 'display:none;'}" alt="Preview Gambar 2">
            </div>
            
            <div class="file-input-wrapper" style="margin-bottom: 12px; margin-top: 4px;">
                <button class="btn-upload" style="background-color: var(--accent-purple); font-size:12px; padding:8px;">🖼 Muat Citra Ke-2</button>
                <input type="file" id="panelFileLogic" accept="image/*" onchange="loadSekunder(event)" />
            </div>

            <button class="apply-btn purple" onclick="operasiLogikaBiner()">▶ &nbsp;Terapkan Logika</button>`;
            
        updateDimensionUI();
    }

    else if (menuType === 'histogram') {
        title.innerText = "Histogram & Ekualisasi";
        content.innerHTML = `
            <p style="font-size:12.5px; color:var(--text-muted); line-height:1.4;">Grafik sebaran intensitas piksel otomatis ter-render pada panel bawah.</p>
            <div style="border-top: 1px solid var(--border); margin-top: 10px; padding-top: 10px;">
                <button class="apply-btn blue" onclick="jalankanEkualisasiHistogram()">▶ &nbsp;Histogram Equalization</button>
            </div>`;
    } 
    else if (menuType === 'convolution') {
        title.innerText = "Konvolusi (Filter)";
        content.innerHTML = `
            <div class="field-row" style="margin-bottom: 12px;">
                <span class="field-label">Pilih Filter</span>
                <select class="select-input" id="convFilter" onchange="toggleConvolutionUI()">
                    <option value="blur">MEAN FILTER (Blur)</option>
                    <option value="sharpen">SHARPENING</option>
                    <option value="sobel">SOBEL EDGE DETECTOR</option>
                </select>
            </div>
            
            <div class="field-row" id="row-sharpen-opt" style="margin-bottom: 12px; display: none; padding-left: 5px;">
                <span class="field-label">Jenis Penajaman:</span>
                <div class="radio-group">
                    <label class="radio-option"><input type="radio" name="sharpenType" value="std" checked> Standard</label>
                    <label class="radio-option"><input type="radio" name="sharpenType" value="high"> Sangat Tajam</label>
                </div>
            </div>

            <div class="field-row" id="row-sobel-opt" style="margin-bottom: 12px; display: none; padding-left: 5px;">
                <span class="field-label">Arah Gradien Tepi:</span>
                <div class="radio-group">
                    <label class="radio-option"><input type="radio" name="sobelDirection" value="h" checked> Horizontal (Dx)</label>
                    <label class="radio-option"><input type="radio" name="sobelDirection" value="v"> Vertikal (Dy)</label>
                </div>
            </div>
            
            <button class="apply-btn blue" onclick="jalankanFiltering()">▶ &nbsp;Terapkan Filter</button>`;
            
        setTimeout(toggleConvolutionUI, 50);
    } 
    else if (menuType === 'morphology') {
        title.innerText = "Morfologi";
        content.innerHTML = `
            <div class="field-row" style="margin-bottom: 10px;">
                <span class="field-label">Operasi</span>
                <div class="radio-group">
                    <label class="radio-option"><input type="radio" name="morphOp" value="dilate" checked> Dilasi</label>
                    <label class="radio-option"><input type="radio" name="morphOp" value="erode"> Erosi</label>
                </div>
            </div>
            <div class="field-label" style="margin-top:8px; margin-bottom:6px;">Structuring Element (SE)</div>
            <div class="se-group">
                <button class="se-btn active" id="se-cross" onclick="selectSE('cross')">
                    <span class="se-title">┼ Cross Element</span>
                    <div class="se-kernel-grid">
                        <div class="cell bg-0">0</div><div class="cell bg-1">1</div><div class="cell bg-0">0</div>
                        <div class="cell bg-1">1</div><div class="cell bg-1">1</div><div class="cell bg-1">1</div>
                        <div class="cell bg-0">0</div><div class="cell bg-1">1</div><div class="cell bg-0">0</div>
                    </div>
                </button>
                <button class="se-btn" id="se-rect" onclick="selectSE('rect')">
                    <span class="se-title">█ Rect Element</span>
                    <div class="se-kernel-grid">
                        <div class="cell bg-1">1</div><div class="cell bg-1">1</div><div class="cell bg-1">1</div>
                        <div class="cell bg-1">1</div><div class="cell bg-1">1</div><div class="cell bg-1">1</div>
                        <div class="cell bg-1">1</div><div class="cell bg-1">1</div><div class="cell bg-1">1</div>
                    </div>
                </button>
            </div>
            <button class="apply-btn pink" onclick="jalankanMorfologi()">▶ &nbsp;Terapkan Morfologi</button>`;
    }
}

function toggleArithmeticUI() {
    const op = document.getElementById('arithOp').value;
    const rowScalar = document.getElementById('row-scalar-val');
    const rowBlend = document.getElementById('row-blend-slider');
    if (op === 'blend') {
        if(rowScalar) rowScalar.style.display = 'none';
        if(rowBlend) rowBlend.style.display = 'flex';
    } else {
        if(rowScalar) rowScalar.style.display = 'flex';
        if(rowBlend) rowBlend.style.display = 'none';
    }
}

function toggleConvolutionUI() {
    const filterEl = document.getElementById('convFilter');
    if (!filterEl) return; 
    
    const filter = filterEl.value;
    const rowSharpen = document.getElementById('row-sharpen-opt');
    const rowSobel = document.getElementById('row-sobel-opt');
    
    if (filter === 'sharpen') {
        if(rowSharpen) rowSharpen.style.display = 'flex';
        if(rowSobel) rowSobel.style.display = 'none';
    } else if (filter === 'sobel') {
        if(rowSharpen) rowSharpen.style.display = 'none';
        if(rowSobel) rowSobel.style.display = 'flex';
    } else {
        if(rowSharpen) rowSharpen.style.display = 'none';
        if(rowSobel) rowSobel.style.display = 'none';
    }
}

function selectSE(type) {
    selectedSE = type;
    document.getElementById('se-cross').classList.toggle('active', type === 'cross');
    document.getElementById('se-rect').classList.toggle('active', type === 'rect');
}

function periksaValiditasInput() {
    let img = document.getElementById('inputImg');
    if (!img.src || img.src === window.location.href) {
        alert("Error: Silakan masukkan file citra utama terlebih dahulu!");
        return false;
    }
    return true;
}

// =======================================================
// OPENCV WORKSPACE COMPUTATION ENGINE
// =======================================================

function prosesGrayscale() {
    if (!periksaValiditasInput()) return;
    setLoadingState(true);
    
    let src = cv.imread('inputImg');
    let dst = new cv.Mat();
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
    cv.imshow('outputCanvas', dst);
    document.getElementById('outputCanvas').style.display = "block";
    updateHistogramChart(dst, true);
    
    src.delete(); dst.delete();
    setLoadingState(false);
}

function konversiCitraBiner(metode) {
    if (!periksaValiditasInput()) return;
    setLoadingState(true);
    
    let src = cv.imread('inputImg');
    let gray = new cv.Mat();
    let dst = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(gray, dst, 127, 255, cv.THRESH_BINARY);
    cv.imshow('outputCanvas', dst);
    document.getElementById('outputCanvas').style.display = "block";
    updateHistogramChart(dst, true);
    
    src.delete(); gray.delete(); dst.delete();
    setLoadingState(false);
}

function operasiAritmatika() {
    if (!periksaValiditasInput()) return;
    
    let op = document.getElementById('arithOp').value;
    let valScalar = parseInt(document.getElementById('arithVal').value) || 0;
    
    valScalar = Math.max(0, Math.min(255, valScalar));
    document.getElementById('arithVal').value = valScalar; 
    
    let alpha = parseFloat(document.getElementById('blendAlpha').value / 100) || 0.5;
    let beta = 1.0 - alpha;
    
    let sImg = document.getElementById('secondaryInputImg');
    let hasSecondImg = (sImg.src && sImg.src !== window.location.href);
    
    setLoadingState(true);
    let img1 = cv.imread('inputImg');
    let finalDst = new cv.Mat();

    if (op === 'blend') {
        if (!hasSecondImg) {
            alert("Peringatan: Mode Perpaduan (Blending) wajib mengunggah Citra Ke-2 terlebih dahulu!");
            img1.delete(); finalDst.delete();
            setLoadingState(false);
            return;
        }
        let img2 = cv.imread('secondaryInputImg');
        let dst1 = new cv.Mat(), dst2 = new cv.Mat();
        
        let dsize = new cv.Size(img1.cols, img1.rows);
        cv.resize(img1, dst1, dsize, 0, 0, cv.INTER_AREA);
        cv.resize(img2, dst2, dsize, 0, 0, cv.INTER_AREA);
        
        cv.addWeighted(dst1, alpha, dst2, beta, 0.0, finalDst);
        img2.delete(); dst1.delete(); dst2.delete();
    } else {
        if (hasSecondImg) {
            let img2 = cv.imread('secondaryInputImg');
            let dst2 = new cv.Mat();
            let dsize = new cv.Size(img1.cols, img1.rows);
            cv.resize(img2, dst2, dsize, 0, 0, cv.INTER_AREA);
            
            if (op === 'add') {
                cv.add(img1, dst2, finalDst);
            } else {
                cv.subtract(img1, dst2, finalDst);
            }
            img2.delete(); dst2.delete();
        } else {
            // PERBAIKAN: Membuat Scalar Matriks 4-channel yang menjaga channel Alpha (nilai 255 di akhir)
            // Ini membuat penjumlahan kecerahan konstan dan pengurangan bekerja stabil tanpa artifact hitam polos
            let scalarMat = new cv.Mat(img1.rows, img1.cols, img1.type(), new cv.Scalar(valScalar, valScalar, valScalar, 0));
            
            if (op === 'add') {
                cv.add(img1, scalarMat, finalDst);
            } else {
                cv.subtract(img1, scalarMat, finalDst);
            }
            scalarMat.delete();
        }
    }

    cv.imshow('outputCanvas', finalDst);
    document.getElementById('outputCanvas').style.display = "block";
    updateHistogramChart(finalDst, true);

    img1.delete(); finalDst.delete();
    setLoadingState(false);
}

function operasiLogikaBiner() {
    let op = document.querySelector('input[name="logicOp"]:checked').value;
    let sImg = document.getElementById('secondaryInputImg');
    let hasSecondImg = (sImg.src && sImg.src !== window.location.href);

    // Proteksi: Operasi AND, OR, dan XOR membutuhkan 2 gambar
    if (op !== 'not' && !hasSecondImg) {
        alert(`Peringatan: Operasi ${op.toUpperCase()} memerlukan Citra Utama DAN Citra Ke-2!`);
        return;
    }

    setLoadingState(true);
    let img1 = cv.imread('inputImg');
    let finalDst = new cv.Mat();

    if (op === 'not') {
        // PERBAIKAN NOT: Ubah ke Grayscale terlebih dahulu agar channel Alpha tidak rusak/transparan
        let gray = new cv.Mat();
        cv.cvtColor(img1, gray, cv.COLOR_RGBA2GRAY, 0);
        
        cv.bitwise_not(gray, finalDst);
        gray.delete();
    } 
    else {
        // Operasi Dua Gambar: AND, OR, XOR
        let img2 = cv.imread('secondaryInputImg');
        let dst1 = new cv.Mat(), dst2 = new cv.Mat();

        // Samakan ukuran kedua citra terlebih dahulu ke format Grayscale matriks biner agar serasi
        cv.cvtColor(img1, dst1, cv.COLOR_RGBA2GRAY, 0);
        cv.cvtColor(img2, dst2, cv.COLOR_RGBA2GRAY, 0);
        
        let dsize = new cv.Size(dst1.cols, dst1.rows);
        cv.resize(dst2, dst2, dsize, 0, 0, cv.INTER_AREA);

        if (op === 'and') cv.bitwise_and(dst1, dst2, finalDst);
        else if (op === 'or') cv.bitwise_or(dst1, dst2, finalDst);
        else if (op === 'xor') cv.bitwise_xor(dst1, dst2, finalDst); // IMPLEMENTASI BARU: XOR

        img2.delete(); dst1.delete(); dst2.delete();
    }

    cv.imshow('outputCanvas', finalDst);
    document.getElementById('outputCanvas').style.display = "block";
    updateHistogramChart(finalDst, true);

    img1.delete(); finalDst.delete();
    setLoadingState(false);
}

function jalankanEkualisasiHistogram() {
    if (!periksaValiditasInput()) return;
    setLoadingState(true);
    
    let src = cv.imread('inputImg');
    let gray = new cv.Mat(), dst = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.equalizeHist(gray, dst);
    cv.imshow('outputCanvas', dst);
    document.getElementById('outputCanvas').style.display = "block";
    updateHistogramChart(dst, true);
    
    src.delete(); gray.delete(); dst.delete();
    setLoadingState(false);
}

function jalankanFiltering() {
    if (!periksaValiditasInput()) return;
    setLoadingState(true);
    
    let filter = document.getElementById('convFilter').value;
    let src = cv.imread('inputImg');
    let dst = new cv.Mat();
    let kernel;

    if (filter === 'blur') {
        kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
            1/9, 1/9, 1/9, 
            1/9, 1/9, 1/9, 
            1/9, 1/9, 1/9
        ]);
        let anchor = new cv.Point(-1, -1);
        cv.filter2D(src, dst, cv.CV_8U, kernel, anchor, 0, cv.BORDER_DEFAULT);
        kernel.delete();
    } 
    else if (filter === 'sharpen') {
        let sharpenRadio = document.querySelector('input[name="sharpenType"]:checked');
        let sharpenType = sharpenRadio ? sharpenRadio.value : 'std';
        
        if (sharpenType === 'std') {
            kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
                 0, -1,  0, 
                -1,  5, -1, 
                 0, -1,  0
            ]);
        } else {
            kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
                -1, -1, -1, 
                -1,  9, -1, 
                -1, -1, -1
            ]);
        }
        let anchor = new cv.Point(-1, -1);
        cv.filter2D(src, dst, cv.CV_8U, kernel, anchor, 0, cv.BORDER_DEFAULT);
        kernel.delete();
    } 
    else if (filter === 'sobel') {
        let sobelRadio = document.querySelector('input[name="sobelDirection"]:checked');
        let sobelDir = sobelRadio ? sobelRadio.value : 'h';
        
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Sobel idealnya diproses pada citra grayscale
        
        // SOLUSI: Menggunakan fungsi bawaan Sobel OpenCV dengan tipe data CV_16S (mendukung nilai negatif)
        if (sobelDir === 'h') {
            // Gradien arah X (Mendeteksi garis vertikal)
            cv.Sobel(gray, dst, cv.CV_16S, 1, 0, 3, 1, 0, cv.BORDER_DEFAULT);
        } else {
            // Gradien arah Y (Mendeteksi garis horizontal)
            cv.Sobel(gray, dst, cv.CV_16S, 0, 1, 3, 1, 0, cv.BORDER_DEFAULT);
        }
        
        // SOLUSI: Mengubah nilai negatif menjadi absolut positif dan mengonversinya kembali ke 8-bit (0-255)
        let absDst = new cv.Mat();
        cv.convertScaleAbs(dst, absDst);
        
        // Salin hasil absolut ke dst agar bisa ditampilkan
        absDst.copyTo(dst);
        
        gray.delete();
        absDst.delete();
    }

    // Tampilkan hasil ke area canvas output
    cv.imshow('outputCanvas', dst);
    document.getElementById('outputCanvas').style.display = "block";
    updateHistogramChart(dst, true);

    src.delete(); 
    dst.delete(); 
    
    setLoadingState(false);
}

function jalankanMorfologi() {
    if (!periksaValiditasInput()) return;
    setLoadingState(true);
    let op = document.querySelector('input[name="morphOp"]:checked').value;

    let src = cv.imread('inputImg');
    let dst = new cv.Mat();
    let ksize = new cv.Size(3, 3);
    let M = (selectedSE === 'cross') ? cv.getStructuringElement(cv.MORPH_CROSS, ksize) : cv.getStructuringElement(cv.MORPH_RECT, ksize);

    if (op === 'dilate') cv.dilate(src, dst, M);
    else cv.erode(src, dst, M);

    cv.imshow('outputCanvas', dst);
    document.getElementById('outputCanvas').style.display = "block";
    updateHistogramChart(dst, true);

    src.delete(); dst.delete(); M.delete();
    setLoadingState(false);
}

// =======================================================
// HISTOGRAM VISUALIZATION ENGINE (CHART.JS)
// =======================================================
function initEmptyChart() {
    const ctx = document.getElementById('histogramChart').getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    gradient.addColorStop(0, 'rgba(30, 41, 59, 0.8)');    
    gradient.addColorStop(0.3, 'rgba(100, 116, 139, 0.7)'); 
    gradient.addColorStop(0.7, 'rgba(148, 163, 184, 0.5)'); 
    gradient.addColorStop(1, 'rgba(226, 232, 240, 0.9)');   

    histogramChartObj = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: Array.from({length: 256}, (_, i) => i),
            datasets: [{
                label: 'Jumlah Piksel',
                data: Array(256).fill(0),
                backgroundColor: gradient, 
                borderColor: '#4f8ef7',     
                borderWidth: 1.5,
                pointRadius: 0,            
                fill: true,                
                tension: 0.3               
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, 
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            let r = context[0].parsed.x;
                            if(r < 85) return `Tingkat Kecerahan: ${r} (Area Gelap/Bayangan)`;
                            if(r < 170) return `Tingkat Kecerahan: ${r} (Area Normal/Sedang)`;
                            return `Tingkat Kecerahan: ${r} (Area Terang/Cahaya)`;
                        },
                        label: function(context) {
                            return ` Ditemukan ${context.parsed.y.toLocaleString()} piksel`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Tingkat Kecerahan Piksel (0 - 255)', 
                        font: { size: 11, weight: '600' },
                        color: '#475569'
                    },
                    grid: { display: false },
                    ticks: {
                        maxTicksLimit: 6,
                        font: { size: 10 }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Banyak Piksel Di Dalam Gambar',
                        font: { size: 10, weight: '600' },
                        color: '#475569'
                    },
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        maxTicksLimit: 4,
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

function updateHistogramChart(srcMatOrImg, isMat = false) {
    let srcGray = new cv.Mat();
    if (!isMat) {
        let src = cv.imread(srcMatOrImg);
        cv.cvtColor(src, srcGray, cv.COLOR_RGBA2GRAY, 0);
        src.delete();
    } else {
        if (srcMatOrImg.channels() > 1) {
            cv.cvtColor(srcMatOrImg, srcGray, cv.COLOR_RGBA2GRAY, 0);
        } else {
            srcMatOrImg.copyTo(srcGray);
        }
    }

    let srcVec = new cv.MatVector();
    srcVec.push_back(srcGray);
    let hist = new cv.Mat(), mask = new cv.Mat();
    cv.calcHist(srcVec, [0], mask, hist, [256], [0, 256], false);
    
    let histData = [];
    for (let i = 0; i < 256; i++) histData.push(hist.data32F[i]);

    histogramChartObj.data.datasets[0].data = histData;
    histogramChartObj.update();

    srcGray.delete(); srcVec.delete(); hist.delete(); mask.delete();
}

// Transformasi & Save View Handlers
function kontrolTransformasi(aksi) {
    let canvas = document.getElementById('outputCanvas');
    if (aksi === 'zoomIn') outputZoom += 0.15;
    if (aksi === 'zoomOut') outputZoom = Math.max(0.2, outputZoom - 0.15);
    if (aksi === 'rotate') outputRotation = (outputRotation + 90) % 360;

    canvas.style.transform = `scale(${outputZoom}) rotate(${outputRotation}deg)`;
}

function resetAll() {
    document.getElementById('fileLoad').value = '';
    
    let img = document.getElementById('inputImg');
    let sImg = document.getElementById('secondaryInputImg');
    let canvas = document.getElementById('outputCanvas');
    
    img.src = ''; img.style.display = "none";
    sImg.src = '';
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = "none";
    
    outputZoom = 1; outputRotation = 0;
    canvas.style.transform = `scale(1) rotate(0deg)`;
    
    initEmptyChart();
    updateDimensionUI(); 
    document.getElementById('rightPanel').classList.remove('visible');
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
}

function saveResult() {
    let canvas = document.getElementById('outputCanvas');
    if (canvas.style.display === "none") { alert('Belum ada citra hasil untuk disimpan!'); return; }
    let a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `praktikum_pcd_${NIM_MAHASISWA}.png`;
    a.click();
}