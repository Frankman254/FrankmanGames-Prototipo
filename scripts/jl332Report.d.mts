export interface Jl332Sample {
    minute: number;
    zoneId: string;
    zoneName: string;
    fps: number;
    p95FrameMs: number;
    heapUsedMB: number;
    heapTotalMB: number;
    heapLimitMB: number;
    walkMeters: number;
    intervalSeconds: number;
    currentZoneId: string | null;
    x: number;
    y: number;
    frames: number;
    pathCommands: number;
}

export interface Jl332Metadata {
    startedAt: string;
    finishedAt: string;
    resolution: string;
    userAgent: string;
    screenshots: string[];
}

export interface Jl332Report {
    markdown: string;
    csv: string;
    svg: string;
    totalWalkSeconds: number;
}

export function buildJl332Report(rows: Jl332Sample[], metadata: Jl332Metadata): Jl332Report;
