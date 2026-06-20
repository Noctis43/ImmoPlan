export class Stack<T> {
    private items: T[];
    private readonly maxSize: number;

    /**
     * @param maxSize 
    */
    constructor(maxSize = 0) {
        this.items = [];
        this.maxSize = maxSize;
    }

    /**
     * @param element 
     * @returns 
    */
    push(element: T): this {
        this.items.push(element);

        if (this.maxSize > 0 && this.items.length > this.maxSize) {
            this.items.shift();
        }

        return this;
    }

    /**
     * @returns
    */
    pop() : T | undefined {
        return this.items.pop();
    }

    /**
     * @returns
    */
    peek(): T | undefined {
        return this.items[this.items.length - 1];
    }

    /**
     * @returns
    */
    isEmpty(): boolean {
        return this.items.length === 0;
    }

    size(): number {
        return this.items.length;
    }

    clear(): void {
        this.items = [];
    }

    /**
     * @returns
    */
    toArray(): T[] {
        return [...this.items].reverse();
    }
}