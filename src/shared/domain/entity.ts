/**
 * Base class for all entities in the domain model.
 * Entities have identity and are distinguished by their ID.
 */
export abstract class Entity<TId> {
  protected readonly _id: TId;

  constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  /**
   * Check equality based on entity ID
   */
  equals(entity?: Entity<TId>): boolean {
    if (!entity) {
      return false;
    }

    if (!(entity instanceof Entity)) {
      return false;
    }

    return this._id === entity._id;
  }

  /**
   * Get a string representation of the entity
   */
  toString(): string {
    return `${this.constructor.name}#${String(this._id)}`;
  }
}