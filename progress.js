var Progress = /** @class */ (function () {
    function Progress(elem, percent) {
        this.elem = elem;
        this.elem.classList.add("progress");
        this.percent = percent;
    }
    Progress.prototype.setData = function (data, labels, colors) {
        this.elem.innerHTML = "";
        var sum = data.reduce(function (a, b) { return a + b; }, 0);
        for (var i = 0; i < data.length; i++) {
            if (data[i] == 0)
                continue;
            var percent = data[i] / sum;
            var color = colors[i];
            var elem = document.createElement("div");
            elem.style.backgroundColor = color;
            elem.style.width = percent * 100 + "%";
            var display = data[i];
            if (this.percent) {
                display = display * 100;
                display = display.toFixed(1) + "%";
            }
            elem.setAttribute("data-tooltip", labels[i] + ": " + display);
            this.elem.appendChild(elem);
        }
    };
    return Progress;
}());
