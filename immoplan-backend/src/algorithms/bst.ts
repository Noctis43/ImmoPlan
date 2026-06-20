interface BSTNode<T> {
    key: number;
    value: T;
    left: BSTNode<T> | null;
    right: BSTNode<T> | null;
}

export class BST<T> {
    private root: BSTNode<T> | null;
    private count: number;

    constructor() {
        this.root = null;
        this.count = 0;
    }

    /**
     * @param key
     * @param value
    */
    insert(key: number, value: T): void {
        const newNode: BSTNode<T> = { key, value, left: null, right: null};

        if (this.root === null) {
            this.root = newNode;
            this.count++;
            return;
        }

        let current = this.root;
        while (true) {
            if (key < current.key) {
                if (current.left === null) {
                    current.left = newNode;
                    this.count++;
                    return;
                }
                current = current.left;
            } else {
                if (current.right === null) {
                    current.right = newNode;
                    this.count++;
                    return;
                }
                current = current.right;
            }
        }
    }

    /**
     * @param minKey
     * @param maxKey
     * @returns
    */
    rangeSearch(minKey: number; maxKey: number): T[] {
        const results: T[] = [];
        this.rangeSearchHelper(this.root, minKey, maxKey, results);
        return results;
    }

    private rangeSearchHelper(node: BSTNode<T> | null, minKey: number, maxKey: number, results: T[]) : void {
        if (node === null) return;

        if (node.key > minKey) {
            this.rangeSearchHelper(node.left, minKey, maxKey, results);
        }

        if (node.key >= minKey && node.key <= maxKey) {
            results.push(node.value);
        }

        if (node.key < maxKey) {
            this.rangeSearchHelper(node.right, minKey, maxKey, results);
        }
    }

    /**
     * @returns
    */
    inOrder(): T[] {
        const results: T[] = [];
        this.inOrderHelper(this.root, results);
        return results;
    }

    private inOrderHelper(node: BSTNode<T> | null, results: T[]): void {
        if (node === null) return;

        this.inOrderHelper(node.left, results);
        results.push(node.value);
        this.inOrderHelper(node.right, results);
    }

    size(): number {
        return this.count;
    }

    isEmpty(): boolean {
        return this.count === 0;
    }
}