import { Scene } from "phaser";

const cellXCount = 160;
const cellYCount = 90;
const edgeCount = 6; // number of cells to calculate beyond each edge of the game area
const updatesPerMinute = 1;
const fadeRate = 0.1; // 0-1 (no fade to immediate fade)
const cellColor = 0x333333;
const historyColor = 0x333333;
const backgroundColor = 0xffffff;

const totalXCount = cellXCount + edgeCount * 2;
const totalYCount = cellYCount + edgeCount * 2;

export class Game extends Scene {
    cellXSize: number;
    cellYSize: number;
    screenWidth: number;
    screenHeight: number;
    ctx: CanvasRenderingContext2D;
    elapsedTime: number;
    cells: Cell[];
    stagingCells: number[];
    canvas: Phaser.GameObjects.Graphics;
    historyCellSprite: Phaser.GameObjects.Container | null;
    currentCellsSprite: Phaser.GameObjects.Container | null;
    histCanvas: Phaser.GameObjects.Graphics;
    stepMode: boolean;

    constructor() {
        super("Game");
        this.cells = [];
        this.stagingCells = [];
        this.elapsedTime = 0;
        this.stepMode = false;
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

        this.canvas = this.add.graphics();

        this.canvas.fillStyle(backgroundColor);
        this.canvas.fillRect(
            0,
            0,
            this.cellXSize * cellXCount,
            this.cellYSize * cellYCount,
        );
        this.histCanvas = this.add.graphics();

        this.add.container(0, 0, [this.canvas]);
        this.input.on(
            "pointermove",
            function(pointer: any) {
                if (pointer.isDown) {
                    this.cells[
                        Math.floor(pointer.x / this.cellXSize + edgeCount) +
                        totalXCount * Math.floor(pointer.y / this.cellYSize + edgeCount)
                    ].alive = true;
                }
            },
            this,
        );

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
        if (this.currentCellsSprite?.data?.count) {
            this.currentCellsSprite?.removeAll();
            this.currentCellsSprite.destroy();
        }

        const canvas = this.add.graphics();
        canvas.fillStyle(0x333333);

        const histCanvas = this.add.graphics();
        if (this.historyCellSprite !== null) {
            histCanvas.fillRect(0, 0, this.screenWidth, this.screenHeight);
        }

        if (this.historyCellSprite?.data?.count) {
            this.historyCellSprite?.removeAll();
            this.historyCellSprite.destroy();
        }

        histCanvas.fillStyle(backgroundColor, fadeRate);
        histCanvas.fillRect(
            0,
            0,
            this.cellXSize * cellXCount,
            this.cellYSize * cellYCount,
        );

        histCanvas.fillStyle(0x553a3a, 1);

        for (var x = 0; x < cellXCount; x++) {
            for (var y = 0; y < cellYCount; y++) {
                if (this.cells[x + edgeCount + totalXCount * (y + edgeCount)].alive) {
                    canvas.fillRect(
                        x * this.cellXSize,
                        y * this.cellYSize,
                        this.cellXSize,
                        this.cellYSize,
                    );
                    histCanvas.fillRect(
                        x * this.cellXSize,
                        y * this.cellYSize,
                        this.cellXSize,
                        this.cellYSize,
                    );
                }
            }
        }

        //this.historyCellSprite = this.add.container(0, 0, [histCanvas]);
        //this.currentCellsSprite = this.add.container(0, 0, [canvas]);
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
