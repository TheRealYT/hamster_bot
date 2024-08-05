function getRandomValueFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomBoolean() {
    return Math.random() < 0.5;
}

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function fingerprintRnd() {
    const timezones = [
        'Africa/Addis_Ababa', 'America/New_York', 'Asia/Tokyo', 'Europe/London', 'America/Los_Angeles',
        'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney', 'Europe/Berlin', 'America/Sao_Paulo'
    ];
    const mobilePlatforms = ['Android', 'iPhone', 'iPad', 'iPod'];
    const languages = ['en-US', 'es-ES', 'fr-FR', 'zh-CN', 'de-DE', 'ja-JP', 'ru-RU', 'ar-SA', 'pt-BR', 'hi-IN'];
    const gpus = ['Adreno (TM) 610', 'Adreno (TM) 640', 'Adreno (TM) 650', 'Mali-G76 MP12', 'PowerVR GE8320'];

    return {
        'version': '4.2.1',
        'visitorId': Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        'components': {
            'fonts': {'value': getRandomValueFromArray(['sans-serif-thin', 'serif', 'monospace', 'cursive']), 'duration': getRandomNumber(0, 100)},
            'domBlockers': {'value': [], 'duration': getRandomNumber(0, 100)},
            'fontPreferences': {
                'value': {
                    'default': getRandomNumber(100, 200),
                    'apple': getRandomNumber(100, 200),
                    'serif': getRandomNumber(100, 200),
                    'sans': getRandomNumber(100, 200),
                    'mono': getRandomNumber(100, 200),
                    'min': getRandomNumber(50, 100),
                    'system': getRandomNumber(100, 200),
                }, 'duration': getRandomNumber(0, 100),
            },
            'audio': {'value': getRandomNumber(0, 0.0001), 'duration': getRandomNumber(0, 100)},
            'screenFrame': {'value': [getRandomNumber(0, 1000), getRandomNumber(0, 1000), getRandomNumber(0, 1000), getRandomNumber(0, 1000)], 'duration': getRandomNumber(0, 100)},
            'canvas': null,
            'osCpu': {'duration': getRandomNumber(0, 100)},
            'languages': {'value': [getRandomValueFromArray(languages)], 'duration': getRandomNumber(0, 100)},
            'colorDepth': {'value': [24, 30, 36, 48][Math.floor(Math.random() * 4)], 'duration': getRandomNumber(0, 100)},
            'deviceMemory': {'value': [4, 8, 16, 32][Math.floor(Math.random() * 4)], 'duration': getRandomNumber(0, 100)},
            'screenResolution': {'value': [getRandomNumber(800, 1920), getRandomNumber(600, 1080)], 'duration': getRandomNumber(0, 100)},
            'hardwareConcurrency': {'value': [2, 4, 8, 16][Math.floor(Math.random() * 4)], 'duration': getRandomNumber(0, 100)},
            'timezone': {'value': getRandomValueFromArray(timezones), 'duration': getRandomNumber(0, 100)},
            'sessionStorage': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'localStorage': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'indexedDB': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'openDatabase': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'cpuClass': {'duration': getRandomNumber(0, 100)},
            'platform': {'value': getRandomValueFromArray(mobilePlatforms), 'duration': getRandomNumber(0, 100)},
            'plugins': {'value': [], 'duration': getRandomNumber(0, 100)},
            'touchSupport': {
                'value': {'maxTouchPoints': getRandomNumber(1, 10), 'touchEvent': getRandomBoolean(), 'touchStart': getRandomBoolean()},
                'duration': getRandomNumber(0, 100),
            },
            'vendor': {'value': ['Google Inc.', 'Apple Inc.', 'Mozilla'][Math.floor(Math.random() * 3)], 'duration': getRandomNumber(0, 100)},
            'vendorFlavors': {'value': [], 'duration': getRandomNumber(0, 100)},
            'cookiesEnabled': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'colorGamut': {'value': ['srgb', 'p3', 'rec2020'][Math.floor(Math.random() * 3)], 'duration': getRandomNumber(0, 100)},
            'invertedColors': {'duration': getRandomNumber(0, 100)},
            'forcedColors': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'monochrome': {'value': getRandomNumber(0, 100), 'duration': getRandomNumber(0, 100)},
            'contrast': {'value': getRandomNumber(0, 100), 'duration': getRandomNumber(0, 100)},
            'reducedMotion': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'reducedTransparency': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'hdr': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'math': {
                'value': {
                    'acos': getRandomNumber(0, 2),
                    'acosh': getRandomNumber(500, 800),
                    'acoshPf': getRandomNumber(300, 400),
                    'asin': getRandomNumber(0, 2),
                    'asinh': getRandomNumber(0, 2),
                    'asinhPf': getRandomNumber(0, 2),
                    'atanh': getRandomNumber(0, 2),
                    'atanhPf': getRandomNumber(0, 2),
                    'atan': getRandomNumber(0, 2),
                    'sin': getRandomNumber(0, 2),
                    'sinh': getRandomNumber(0, 2),
                    'sinhPf': getRandomNumber(0, 2),
                    'cos': getRandomNumber(-1, 1),
                    'cosh': getRandomNumber(1, 2),
                    'coshPf': getRandomNumber(1, 2),
                    'tan': getRandomNumber(-2, 2),
                    'tanh': getRandomNumber(0, 1),
                    'tanhPf': getRandomNumber(0, 1),
                    'exp': getRandomNumber(1, 3),
                    'expm1': getRandomNumber(1, 3),
                    'expm1Pf': getRandomNumber(1, 3),
                    'log1p': getRandomNumber(1, 3),
                    'log1pPf': getRandomNumber(1, 3),
                    'powPI': getRandomNumber(1e-60, 1e-40),
                }, 'duration': getRandomNumber(0, 100),
            },
            'pdfViewerEnabled': {'value': getRandomBoolean(), 'duration': getRandomNumber(0, 100)},
            'architecture': {'value': Math.floor(getRandomNumber(100, 200)), 'duration': getRandomNumber(0, 100)},
            'applePay': {'value': getRandomNumber(-1, 1), 'duration': getRandomNumber(0, 100)},
            'privateClickMeasurement': {'duration': getRandomNumber(0, 100)},
            'webGlBasics': {
                'value': {
                    'version': getRandomValueFromArray(['WebGL 1.0', 'WebGL 2.0']),
                    'vendor': getRandomValueFromArray(['WebKit', 'Mozilla']),
                    'vendorUnmasked': getRandomValueFromArray(['Qualcomm', 'NVIDIA', 'Mali']),
                    'renderer': getRandomValueFromArray(['WebKit WebGL', 'NVIDIA WebGL', 'Mali WebGL']),
                    'rendererUnmasked': getRandomValueFromArray(gpus),
                    'shadingLanguageVersion': getRandomValueFromArray(['WebGL GLSL ES 1.0', 'WebGL GLSL ES 3.0']),
                }, 'duration': getRandomNumber(0, 100),
            },
            'webGlExtensions': null,
        },
    };
}

function fingerprint() {
    return {
        'version': '4.2.1', 'visitorId': '7d88c4adf7fd1aba1ab0263d71a12a54', 'components': {
            'fonts': {'value': ['sans-serif-thin'], 'duration': 92},
            'domBlockers': {'value': [], 'duration': 41},
            'fontPreferences': {
                'value': {
                    'default': 145.90625,
                    'apple': 145.90625,
                    'serif': 164.71875,
                    'sans': 145.90625,
                    'mono': 132.625,
                    'min': 72.953125,
                    'system': 145.90625,
                }, 'duration': 18,
            },
            'audio': {'value': 0.00007444995, 'duration': 43},
            'screenFrame': {'value': [0, 0, 0, 0], 'duration': 3},
            'canvas': null,
            'osCpu': {'duration': 0},
            'languages': {'value': [['en-US']], 'duration': 0},
            'colorDepth': {'value': 24, 'duration': 1},
            'deviceMemory': {'value': 4, 'duration': 0},
            'screenResolution': {'value': [860, 386], 'duration': 0},
            'hardwareConcurrency': {'value': 8, 'duration': 0},
            'timezone': {'value': 'Africa/Addis_Ababa', 'duration': 0},
            'sessionStorage': {'value': true, 'duration': 0},
            'localStorage': {'value': true, 'duration': 0},
            'indexedDB': {'value': true, 'duration': 0},
            'openDatabase': {'value': true, 'duration': 0},
            'cpuClass': {'duration': 0},
            'platform': {'value': 'Linux aarch64', 'duration': 0},
            'plugins': {'value': [], 'duration': 1},
            'touchSupport': {
                'value': {'maxTouchPoints': 5, 'touchEvent': true, 'touchStart': true},
                'duration': 0,
            },
            'vendor': {'value': 'Google Inc.', 'duration': 0},
            'vendorFlavors': {'value': [], 'duration': 1},
            'cookiesEnabled': {'value': true, 'duration': 10},
            'colorGamut': {'value': 'srgb', 'duration': 0},
            'invertedColors': {'duration': 0},
            'forcedColors': {'value': false, 'duration': 0},
            'monochrome': {'value': 0, 'duration': 0},
            'contrast': {'value': 0, 'duration': 0},
            'reducedMotion': {'value': false, 'duration': 0},
            'reducedTransparency': {'value': false, 'duration': 0},
            'hdr': {'value': false, 'duration': 0},
            'math': {
                'value': {
                    'acos': 1.4473588658278522,
                    'acosh': 709.889355822726,
                    'acoshPf': 355.291251501643,
                    'asin': 0.12343746096704435,
                    'asinh': 0.881373587019543,
                    'asinhPf': 0.8813735870195429,
                    'atanh': 0.5493061443340548,
                    'atanhPf': 0.5493061443340548,
                    'atan': 0.4636476090008061,
                    'sin': 0.8178819121159085,
                    'sinh': 1.1752011936438014,
                    'sinhPf': 2.534342107873324,
                    'cos': -0.8390715290095377,
                    'cosh': 1.5430806348152437,
                    'coshPf': 1.5430806348152437,
                    'tan': -1.4214488238747245,
                    'tanh': 0.7615941559557649,
                    'tanhPf': 0.7615941559557649,
                    'exp': 2.718281828459045,
                    'expm1': 1.718281828459045,
                    'expm1Pf': 1.718281828459045,
                    'log1p': 2.3978952727983707,
                    'log1pPf': 2.3978952727983707,
                    'powPI': 1.9275814160560204e-50,
                }, 'duration': 1,
            },
            'pdfViewerEnabled': {'value': false, 'duration': 0},
            'architecture': {'value': 127, 'duration': 0},
            'applePay': {'value': -1, 'duration': 0},
            'privateClickMeasurement': {'duration': 0},
            'webGlBasics': {
                'value': {
                    'version': 'WebGL 1.0 (OpenGL ES 2.0 Chromium)',
                    'vendor': 'WebKit',
                    'vendorUnmasked': 'Qualcomm',
                    'renderer': 'WebKit WebGL',
                    'rendererUnmasked': 'Adreno (TM) 610',
                    'shadingLanguageVersion': 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)',
                }, 'duration': 25,
            },
            'webGlExtensions': null,
        },
    };
}

const MIN_V = 87;
const MAX_V = 124;

function rand(min, max, round = false) {
    return (round ? Math.round : (x) => x)(Math.random() * (max - min) + min);
}

module.exports = {
    fingerprint: fingerprintRnd,
    chromeV: () => rand(MIN_V, MAX_V),
};

console.log(JSON.stringify(fingerprintRnd(), undefined, 3));