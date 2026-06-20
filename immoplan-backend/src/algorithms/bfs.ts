import { Queue } from "./queue";

export interface Graph {
    adjacencyList: Map<number, number[]>;
}

/**
 * @param edges
 * @returns
*/
export function buildGraph(edges: Array<[number, number]>): Graph {
    const adjacencyList = new Map<number, number[]>();

    for (const [a, b] of edges) {
        if (!adjacencyList.has(a)) {
            adjacencyList.set(a, []);
        }

        if (!adjacencyList.has(b)) {
            adjacencyList.set(b, []);
        }

        adjacencyList.get(a)!.push(b);
        adjacencyList.get(b)!.push(a);
    }

    return { adjacencyList};
}

export interface BFSResult {
    nodeId: number;
    level: number;
}

/**
 * @param graph
 * @param startNode
 * @param maxDepth
 * @returns
*/
export function bfs(graph: Graph, startNode: number, maxDepth = 3): BFSResult[] {
    const results: BFSResult[] = [];
    const visited = new Set<number>();
    const queue = new Queue<[number, number]>();
    queue.enqueue([startNode, 0]);
    visited.add(startNode);

    while (!queue.isEmpty()) {
        const [currentNode, currentlevel] = queue.dequeue()!;
        results.push({ nodeId: currentNode, level: currentlevel});

        if (currentlevel >= maxDepth) {
            continue;
        }

        const neighbors = graph.adjacencyList.get(currentNode) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.enqueue([neighbor, currentlevel + 1]);
            }
        }
    }
    return results;
}

/**
 * @param graph
 * @param startNode
 * @param maxDepth
 * @returns
*/
export function bfsByLevel(graph: Graph, startNode: number, maxDepth = 3): Map<number, number[]> {
    const results = bfs(graph, startNode, maxDepth);
    const levels = new Map<number, number[]>();

    for (const { nodeId, level} of results) {
        if (!levels.has(level)) {
            levels.set(level, []);
        }
        levels.get(level)!.push(nodeId);
    }
    return levels;
}

