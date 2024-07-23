import { Scene } from "phaser";

const cellXCount = 160;
const cellYCount = 90;
const edgeCount = 6; // number of cells to calculate beyond each edge of the game area
const updatesPerMinute = 1;
const fadeRate = 0.5; // 0-1 (no fade to immediate fade)
const cellColor = 0x333333;
const backgroundColor = 0xffffff;

const totalXCount = cellXCount + edgeCount * 2;
const totalYCount = cellYCount + edgeCount * 2;

const historyLimit = 10;

export class Game extends Scene {
    cellXSize: number;
    cellYSize: number;
    screenWidth: number;
    screenHeight: number;
    ctx: CanvasRenderingContext2D;
    elapsedTime: number;
    cells: Cell[];
    stagingCells: number[];
    canvasIndex: number;
    buffer: Phaser.GameObjects.Graphics[];
    stepMode: boolean;
    historyCount: number;

    constructor() {
        super("Game");
        this.cells = [];
        this.stagingCells = [];
        this.elapsedTime = 0;
        this.stepMode = false;
        this.historyCount = 0;
        this.canvasIndex = 1;
        this.buffer = [];
    }

    get canvas() {
        return this.buffer[this.canvasIndex];
    }

    preload() { }

    create() {
        this.screenWidth = this.cameras.main.width;
        this.screenHeight = this.cameras.main.height;
        this.cellXSize = this.screenWidth / cellXCount;
        this.cellYSize = this.screenHeight / cellYCount;
        let cellSize = (cellXCount + edgeCount * 2) * (cellYCount + edgeCount * 2);
        const cellSizeTotal = cellSize;

        while (cellSize--) {
            var cell = new Cell(cellSizeTotal - cellSize);
            cell.alive = false;
            this.cells.push(cell);
        }

        for (var i = 0; i < cellSizeTotal; i++) {
            this.setCellNeighbors(i);
        }

        this.buffer.push(this.add.graphics());
        this.buffer.push(this.add.graphics());

        this.fillBackground(false);

        this.input.on("pointermove", this.getMouseInputFunction(true), this);
        this.input.on("pointerdown", this.getMouseInputFunction(false), this);

        document.getElementById("step")?.addEventListener("click", () => {
            this.stepMode = true;
            this.step();
        });

        document.getElementById("start")?.addEventListener("click", () => {
            this.stepMode = false;
        });
        document.getElementById("clear")?.addEventListener("click", () => {
            for (let cell of this.cells) {
                cell.alive = false;
            }
            this.fillBackground(false);
        });
        document.getElementById("random")?.addEventListener("click", () => {
            const rdg = new Phaser.Math.RandomDataGenerator();
            for (let cell of this.cells) {
                cell.alive = rdg.integerInRange(0, 1) === 0;
            }
        });
    }

    update(_: number, delta: number): void {
        this.elapsedTime += delta;

        if (this.elapsedTime > 60 / updatesPerMinute) {
            this.elapsedTime -= 60 / updatesPerMinute;
            if (!this.stepMode) this.step();
        }
        if (this.stepMode) this.fillBackground(false);
        this.drawCells();
    }

    step() {
        for (var y = 0; y < totalYCount; y++) {
            for (var x = 0; x < totalXCount; x++) {
                var index = x + totalXCount * y;
                this.stagingCells[index] = this.getNewCellStatus(index);
            }
        }

        for (var i = 0; i < this.stagingCells.length; i++) {
            this.cells[i].alive = this.stagingCells[i] === 1;
        }
        this.fillBackground(true);
    }

    fillBackground(faded: boolean) {
        this.historyCount++;
        if (this.historyCount > historyLimit) this.swapBuffer();
        this.canvas.fillStyle(backgroundColor, faded ? fadeRate : 1);
        this.canvas.fillRect(
            0,
            0,
            this.cellXSize * cellXCount,
            this.cellYSize * cellYCount,
        );
    }
    swapBuffer() {
        this.canvas.depth = 0;
        this.canvasIndex = (this.canvasIndex + 1) % 2;
        this.canvas.depth = 10;
        this.canvas.clear();
        this.historyCount = 0;
    }

    drawCells() {
        this.canvas.fillStyle(cellColor);
        for (var x = 0; x < cellXCount; x++) {
            for (var y = 0; y < cellYCount; y++) {
                if (this.cells[x + edgeCount + totalXCount * (y + edgeCount)].alive) {
                    this.canvas.fillRect(
                        x * this.cellXSize,
                        y * this.cellYSize,
                        this.cellXSize,
                        this.cellYSize,
                    );
                }
            }
        }
    }

    getMouseInputFunction(onlyPlace: boolean) {
        const mouseInput = (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown) {
                const x = Math.floor(pointer.x / this.cellXSize + edgeCount);
                const y = Math.floor(pointer.y / this.cellYSize + edgeCount);
                const index = x + totalXCount * y;
                this.cells[index].alive = onlyPlace ? true : !this.cells[index].alive;
            }
        };
        return mouseInput;
    }

    getNewCellStatus(index: number) {
        let retVal = null;
        let currentStatus = this.cells[index].alive;
        let neighborCount = this.cells[index].getAliveNeighborCount();

        if (currentStatus) {
            if (neighborCount < 2 || neighborCount > 3) {
                retVal = 0;
            } else {
                retVal = 1;
            }
        } else {
            if (neighborCount === 3 || neighborCount === 6) {
                retVal = 1;
            } else {
                retVal = 0;
            }
        }

        return retVal;
    }

    setCellNeighbors(index: number) {
        if (index >= totalXCount) {
            if (index % totalXCount > 0) {
                this.cells[index].neighbors.push(this.cells[index - totalXCount - 1]);
            }
            this.cells[index].neighbors.push(this.cells[index - totalXCount]);
            if ((index + 1) % totalXCount > 0) {
                this.cells[index].neighbors.push(this.cells[index - totalXCount + 1]);
            }
        }
        if (index != 0 && index % totalXCount > 0) {
            this.cells[index].neighbors.push(this.cells[index - 1]);
        }
        if ((index + 1) % totalXCount > 0) {
            this.cells[index].neighbors.push(this.cells[index + 1]);
        }
        if (index < totalXCount * totalYCount - totalXCount) {
            if (index != 0 && index % totalXCount > 0) {
                this.cells[index].neighbors.push(this.cells[index + totalXCount - 1]);
            }
            this.cells[index].neighbors.push(this.cells[index + totalXCount]);
            if ((index + 1) % totalXCount > 0) {
                this.cells[index].neighbors.push(this.cells[index + totalXCount + 1]);
            }
        }
    }
}

class Cell {
    index: number;
    alive: boolean;
    neighbors: Cell[];
    constructor(index: number) {
        this.index = index;
        this.alive = false;
        this.neighbors = [];
    }

    getAliveNeighborCount() {
        var ret = 0;
        for (var i = 0; i < this.neighbors.length; i++) {
            if (this.neighbors[i].alive) {
                ret++;
            }
        }
        return ret;
    }
}
