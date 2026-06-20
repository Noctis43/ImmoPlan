export class Queue<T> {
    private items: Record<number, T>;
    private headIndex: number;
    private tailIndex: number;

    constructor() {
        this.items = {};
        this.headIndex = 0;
        this.tailIndex = 0;
    }

    /**
     * @param element
     * @retuns
    */
    enqueue(element: T): this {
        this.items[this.tailIndex] = element;
        this.tailIndex++;
        return this;
    }

    /**
     * @returns
    */
    dequeue(): T | undefined {
        if (this.isEmpty()) {
            return undefined;
        }

        const item = this.items[this.headIndex];
        delete this.items[this.headIndex];
        this.headIndex++;
        return item;
    }

    /**
     * @returns
    */
    front(): T | undefined {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items[this.headIndex];
    }

    isEmpty(): boolean {
        return this.tailIndex - this.headIndex === 0; 
    }

    size(): number {
        return this.tailIndex - this.headIndex;
    }

    clear(): void {
        this.items ={};
        this.headIndex = 0;
        this.tailIndex = 0;
    }

    toArray(): T[] {
        const result: T[] = [];
        for (let i = this.headIndex; i < this.tailIndex; i++) {
            result.push(this.items[i]);
        }
        return result;
    }
}