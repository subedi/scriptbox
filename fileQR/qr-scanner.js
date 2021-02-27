export default class QrScanner {
    /* async */


    /* async */



    /* async */
    static scanImage(imageOrFileOrUrl, scanRegion=null, qrEngine=null, canvas=null, fixedCanvasSize=false,
                     alsoTryWithoutScanRegion=false) {
        const gotExternalWorker = qrEngine instanceof Worker;

        let promise = Promise.all([
            qrEngine || QrScanner.createQrEngine(),
            QrScanner._loadImage(imageOrFileOrUrl),
        ]).then(([engine, image]) => {
            qrEngine = engine;
            let canvasContext;
            [canvas, canvasContext] = this._drawToCanvas(image, scanRegion, canvas, fixedCanvasSize);

            if (qrEngine instanceof Worker) {
                if (!gotExternalWorker) {
                    // Enable scanning of inverted color qr codes. Not using _postWorkerMessage as it's async
                    qrEngine.postMessage({ type: 'inversionMode', data: 'both' });
                }
                return new Promise((resolve, reject) => {
                    let timeout, onMessage, onError;
                    onMessage = event => {
                        if (event.data.type !== 'qrResult') {
                            return;
                        }
                        qrEngine.removeEventListener('message', onMessage);
                        qrEngine.removeEventListener('error', onError);
                        clearTimeout(timeout);
                        if (event.data.data !== null) {
                            resolve(event.data.data);
                        } else {
                            reject(QrScanner.NO_QR_CODE_FOUND);
                        }
                    };
                    onError = (e) => {
                        qrEngine.removeEventListener('message', onMessage);
                        qrEngine.removeEventListener('error', onError);
                        clearTimeout(timeout);
                        const errorMessage = !e ? 'Unknown Error' : (e.message || e);
                        reject('Scanner error: ' + errorMessage);
                    };
                    qrEngine.addEventListener('message', onMessage);
                    qrEngine.addEventListener('error', onError);
                    timeout = setTimeout(() => onError('timeout'), 10000);
                    const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
                    qrEngine.postMessage({
                        type: 'decode',
                        data: imageData
                    }, [imageData.data.buffer]);
                });
            } else {
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject('Scanner error: timeout'), 10000);
                    qrEngine.detect(canvas).then(scanResults => {
                        if (!scanResults.length) {
                            reject(QrScanner.NO_QR_CODE_FOUND);
                        } else {
                            resolve(scanResults[0].rawValue);
                        }
                    }).catch((e) => reject('Scanner error: ' + (e.message || e))).finally(() => clearTimeout(timeout));
                });
            }
        });

        if (scanRegion && alsoTryWithoutScanRegion) {
            promise = promise.catch(() => QrScanner.scanImage(imageOrFileOrUrl, null, qrEngine, canvas, fixedCanvasSize));
        }

        promise = promise.finally(() => {
            if (gotExternalWorker) return;
            QrScanner._postWorkerMessage(qrEngine, 'close');
        });

        return promise;
    }

    setGrayscaleWeights(red, green, blue, useIntegerApproximation = true) {
        // Note that for the native BarcodeDecoder, this is a no-op. However, the native implementations work also
        // well with colored qr codes.
        QrScanner._postWorkerMessage(
            this._qrEnginePromise,
            'grayscaleWeights',
            { red, green, blue, useIntegerApproximation }
        );
    }

    setInversionMode(inversionMode) {
        // Note that for the native BarcodeDecoder, this is a no-op. However, the native implementations scan normal
        // and inverted qr codes by default
        QrScanner._postWorkerMessage(this._qrEnginePromise, 'inversionMode', inversionMode);
    }

    /* async */
    static createQrEngine(workerPath = QrScanner.WORKER_PATH) {
        return ('BarcodeDetector' in window ? BarcodeDetector.getSupportedFormats() : Promise.resolve([]))
            .then((supportedFormats) => supportedFormats.indexOf('qr_code') !== -1
                ? new BarcodeDetector({ formats: ['qr_code'] })
                : new Worker(workerPath)
            );
    }

    _onPlay() {
        this._scanRegion = this._calculateScanRegion(this.$video);
        this._scanFrame();
    }

    _onLoadedMetaData() {
        this._scanRegion = this._calculateScanRegion(this.$video);
    }

    _onVisibilityChange() {
        if (document.hidden) {
            this.pause();
        } else if (this._active) {
            this.start();
        }
    }

    _calculateScanRegion(video) {
        // Default scan region calculation. Note that this can be overwritten in the constructor.
        const smallestDimension = Math.min(video.videoWidth, video.videoHeight);
        const scanRegionSize = Math.round(2 / 3 * smallestDimension);
        return {
            x: (video.videoWidth - scanRegionSize) / 2,
            y: (video.videoHeight - scanRegionSize) / 2,
            width: scanRegionSize,
            height: scanRegionSize,
            downScaledWidth: this._legacyCanvasSize,
            downScaledHeight: this._legacyCanvasSize,
        };
    }



    _onDecodeError(error) {
        // default error handler; can be overwritten in the constructor
        if (error === QrScanner.NO_QR_CODE_FOUND) return;
        console.log(error);
    }

    
    static _drawToCanvas(image, scanRegion=null, canvas=null, fixedCanvasSize=false) {
        canvas = canvas || document.createElement('canvas');
        const scanRegionX = scanRegion && scanRegion.x? scanRegion.x : 0;
        const scanRegionY = scanRegion && scanRegion.y? scanRegion.y : 0;
        const scanRegionWidth = scanRegion && scanRegion.width? scanRegion.width : image.width || image.videoWidth;
        const scanRegionHeight = scanRegion && scanRegion.height? scanRegion.height : image.height || image.videoHeight;
        if (!fixedCanvasSize) {
            canvas.width = scanRegion && scanRegion.downScaledWidth? scanRegion.downScaledWidth : scanRegionWidth;
            canvas.height = scanRegion && scanRegion.downScaledHeight? scanRegion.downScaledHeight : scanRegionHeight;
        }
        const context = canvas.getContext('2d', { alpha: false });
        context.imageSmoothingEnabled = false; // gives less blurry images
        context.drawImage(
            image,
            scanRegionX, scanRegionY, scanRegionWidth, scanRegionHeight,
            0, 0, canvas.width, canvas.height
        );
        return [canvas, context];
    }

    /* async */
    static _loadImage(imageOrFileOrBlobOrUrl) {
        if (imageOrFileOrBlobOrUrl instanceof HTMLCanvasElement || imageOrFileOrBlobOrUrl instanceof HTMLVideoElement
            || window.ImageBitmap && imageOrFileOrBlobOrUrl instanceof window.ImageBitmap
            || window.OffscreenCanvas && imageOrFileOrBlobOrUrl instanceof window.OffscreenCanvas) {
            return Promise.resolve(imageOrFileOrBlobOrUrl);
        } else if (imageOrFileOrBlobOrUrl instanceof Image) {
            return QrScanner._awaitImageLoad(imageOrFileOrBlobOrUrl).then(() => imageOrFileOrBlobOrUrl);
        } else if (imageOrFileOrBlobOrUrl instanceof File || imageOrFileOrBlobOrUrl instanceof Blob
            || imageOrFileOrBlobOrUrl instanceof URL || typeof(imageOrFileOrBlobOrUrl)==='string') {
            const image = new Image();
            if (imageOrFileOrBlobOrUrl instanceof File || imageOrFileOrBlobOrUrl instanceof Blob) {
                image.src = URL.createObjectURL(imageOrFileOrBlobOrUrl);
            } else {
                image.src = imageOrFileOrBlobOrUrl;
            }
            return QrScanner._awaitImageLoad(image).then(() => {
                if (imageOrFileOrBlobOrUrl instanceof File || imageOrFileOrBlobOrUrl instanceof Blob) {
                    URL.revokeObjectURL(image.src);
                }
                return image;
            });
        } else {
            return Promise.reject('Unsupported image type.');
        }
    }

    /* async */
    static _awaitImageLoad(image) {
        return new Promise((resolve, reject) => {
            if (image.complete && image.naturalWidth!==0) {
                // already loaded
                resolve();
            } else {
                let onLoad, onError;
                onLoad = () => {
                    image.removeEventListener('load', onLoad);
                    image.removeEventListener('error', onError);
                    resolve();
                };
                onError = () => {
                    image.removeEventListener('load', onLoad);
                    image.removeEventListener('error', onError);
                    reject('Image load error');
                };
                image.addEventListener('load', onLoad);
                image.addEventListener('error', onError);
            }
        });
    }

    /* async */
    static _postWorkerMessage(qrEngineOrQrEnginePromise, type, data) {
        return Promise.resolve(qrEngineOrQrEnginePromise).then((qrEngine) => {
            if (!(qrEngine instanceof Worker)) return;
            qrEngine.postMessage({ type, data });
        });
    }
}
QrScanner.DEFAULT_CANVAS_SIZE = 400;
QrScanner.NO_QR_CODE_FOUND = 'No QR code found';

