import { Text } from 'react-native';

type Props = {
  readonly symbol: string;
  readonly size?: number;
  readonly label: string;
};

export function Emoji({ symbol, size, label }: Props) {
  return (
    <Text accessible accessibilityLabel={label} style={{ fontSize: size ?? 16 }}>
      {symbol}
    </Text>
  );
}
