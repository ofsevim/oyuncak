import Trait from '../Trait.js';

export default class Physics extends Trait {
    update(entity, gameContext, level) {
        const { deltaTime } = gameContext;

        entity.previousVelocity = { x: entity.vel.x, y: entity.vel.y };
        entity.previousBounds = {
            top: entity.bounds.top,
            bottom: entity.bounds.bottom,
            left: entity.bounds.left,
            right: entity.bounds.right
        };

        entity.pos.x += entity.vel.x * deltaTime;
        level.tileCollider.checkX(entity, gameContext, level);

        entity.pos.y += entity.vel.y * deltaTime;
        level.tileCollider.checkY(entity, gameContext, level);

        entity.vel.y += level.gravity * deltaTime;
    }
}
