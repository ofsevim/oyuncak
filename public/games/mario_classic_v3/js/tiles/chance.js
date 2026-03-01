import { Sides } from '../Entity.js';
import Player from '../traits/Player.js';

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

function handleY({ entity, match, resolver, gameContext, level }) {
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
            if (entity.traits.has(Player)) {
                entity.sounds.add('coin');

                const player = entity.traits.get(Player);
                if (player) {
                    player.addCoins(1);
                }

                const grid = resolver.matrix;
                grid.set(match.indexX, match.indexY, {
                    style: 'metal',
                    behavior: 'ground'
                });
            }

            entity.obstruct(Sides.TOP, match);
        }
    }
}

export const chance = [handleX, handleY];

