import { Sides } from '../Entity.js';

function handleX({ entity, match }) {
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

function handleY({ entity, match }) {
    const isMovingDown = entity.previousVelocity ? entity.previousVelocity.y > 0 : entity.vel.y > 0;
    const isMovingUp = entity.previousVelocity ? entity.previousVelocity.y < 0 : entity.vel.y < 0;

    const prevBottom = entity.previousBounds ? entity.previousBounds.bottom : entity.bounds.bottom;
    const prevTop = entity.previousBounds ? entity.previousBounds.top : entity.bounds.top;

    if (isMovingDown) {
        if (entity.bounds.bottom > match.y1 && prevBottom <= match.y1) {
            entity.obstruct(Sides.BOTTOM, match);
        }
    } else if (isMovingUp) {
        if (entity.bounds.top < match.y2 && prevTop >= match.y2) {
            entity.obstruct(Sides.TOP, match);
        }
    }
}

export const ground = [handleX, handleY];
