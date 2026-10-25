import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: number | string;
  borderRadius?: string;
  count?: number;
}

export function Skeleton({ width = '100%', height = 16, borderRadius, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={styles.skeleton}
          style={{ width, height, borderRadius, marginBottom: count > 1 ? 8 : undefined }}
        />
      ))}
    </>
  );
}
