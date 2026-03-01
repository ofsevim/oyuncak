export function loadImage(url) {
    if (url.startsWith('/')) {
        url = url.substring(1);
    }
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => {
            resolve(image);
        });
        image.src = url;
    });
}

export function loadJSON(url) {
    if (url.startsWith('/')) {
        url = url.substring(1);
    }
    return fetch(url)
        .then(r => r.json());
}
