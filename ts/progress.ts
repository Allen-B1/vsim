class Progress {
    elem: HTMLDivElement

    constructor(elem: HTMLDivElement) {
        this.elem = elem;
        this.elem.classList.add("progress");
    }

    setData(data: number[], labels: string[], colors: string[]) {
        this.elem.innerHTML = "";
        let sum = data.reduce((a, b) => a + b, 0);
        for (let i = 0; i < data.length; i++) {
            if (data[i] == 0) continue;

            let percent = data[i] / sum;
            let color = colors[i];
            let elem = document.createElement("div");
            elem.style.backgroundColor = color;
            elem.style.width = percent*100 + "%";

            let display: any = data[i];
            if (sum >= 0.99 && sum <= 1) {
                display = display * 100;
                display = display.toFixed(1) + "%";
            }

            elem.setAttribute("data-tooltip", labels[i] + ": " + display);
            this.elem.appendChild(elem);
        }
    }
}