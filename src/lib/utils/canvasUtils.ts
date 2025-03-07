export function scaleCanvasCoordinates(
    domCanvas: HTMLCanvasElement,
    sourceCanvas: HTMLCanvasElement,
    x: number,
    y: number
) {
    const scaleX = sourceCanvas.width / domCanvas.clientWidth;
    const scaleY = sourceCanvas.height / domCanvas.clientHeight;
    return { x: x * scaleX, y: y * scaleY };
}

export function drawSelectionRectangle(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    currentX: number,
    currentY: number
) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();
    ctx.rect(
        Math.min(startX, currentX),
        Math.min(startY, currentY),
        Math.abs(currentX - startX),
        Math.abs(currentY - startY)
    );
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
}