/**
 * Base class for value objects in the domain model.
 * Value objects are immutable and compared by their properties.
 */
export abstract class ValueObject<TProps> {
  protected readonly props: TProps;

  constructor(props: TProps) {
    this.props = Object.freeze(props);
  }

  /**
   * Check equality based on structural equality of properties
   */
  equals(vo?: ValueObject<TProps>): boolean {
    if (!vo) {
      return false;
    }

    if (!(vo instanceof ValueObject)) {
      return false;
    }

    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * Get a string representation of the value object
   */
  toString(): string {
    return JSON.stringify(this.props);
  }
}