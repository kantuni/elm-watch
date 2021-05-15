import * as Decode from "tiny-decoders";

export type NonEmptyArray<T> = [T, ...Array<T>];

export function NonEmptyArray<T>(
  decoder: Decode.Decoder<T>
): Decode.Decoder<NonEmptyArray<T>> {
  return Decode.chain(Decode.array(decoder), (array) => {
    if (isNonEmptyArray(array)) {
      return array;
    }
    throw new Decode.DecoderError({
      message: "Expected a non-empty array",
      value: array,
    });
  });
}

export function isNonEmptyArray<T>(array: Array<T>): array is NonEmptyArray<T> {
  return array.length >= 1;
}

export function mapNonEmptyArray<T, U>(
  array: NonEmptyArray<T>,
  f: (item: T, index: number) => U
): NonEmptyArray<U> {
  return array.map(f) as NonEmptyArray<U>;
}