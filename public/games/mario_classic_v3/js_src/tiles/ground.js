import {Sides} from '../Entity.js';

function handleX({entity, match}) {
    if (entity.vel.x > 0) {
        if (entity.bounds.right > match.x1) {
            entity.obstruct(Sides.RIGHT, match);
        }
    } else if (entity.vel.x < 0) {
        if (entity.bounds.left < match.x2) {
            entity.obstruct(Sides.LEFT, match);
        }
    }
}

function handleY({entity, match}) {
    if (entity.vel.y > 0) {
        // Moving down
        if (entity.bounds.bottom > match.y1) {
            entity.obstruct(Sides.BOTTOM, match);
        }
    } else if (entity.vel.y < 0) {
        // Moving up - head collision with ground blocks
        const prevTop = entity.prevPos.y + entity.offset.y;
        const currentTop = entity.bounds.top;
        
        // Check if we were below and now hitting
        const wasBelow = prevTop >= match.y2;
        const isHitting = currentTop <= match.y2 && currentTop >= match.y1;
        
        if (wasBelow && isHitting) {
            entity.obstruct(Sides.TOP, match);
        }
    }
}

export const ground = [handleX, handleY];
