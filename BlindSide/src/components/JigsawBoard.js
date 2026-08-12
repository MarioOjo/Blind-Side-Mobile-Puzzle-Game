// Builds the measured puzzle board, locked-piece layer, progress header, and paged piece tray.
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from 'react-native-svg';
import JigsawPiece from './JigsawPiece';
import {
  createJigsawPieces,
  createTrayOrder,
  getSnapTolerance,
} from '../utils/jigsaw';
import colors from '../theme/colors';
import typography from '../theme/typography';
import shadows from '../theme/shadows';

const WORKSPACE_GAP = 16;
const TRAY_MIN_WIDTH = 150;
const TRAY_MAX_WIDTH = 220;
const TRAY_HEADER_HEIGHT = 78;

function PlacedPiece({ piece, imageUrl, boardWidth, boardHeight }) {
  const clipId = `placed-clip-${piece.id}`;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.placedPiece,
        {
          left: piece.targetX - piece.padding,
          top: piece.targetY - piece.padding,
          width: piece.renderWidth,
          height: piece.renderHeight,
        },
      ]}
    >
      <Svg width={piece.renderWidth} height={piece.renderHeight}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={piece.path} />
          </ClipPath>
        </Defs>
        <SvgImage
          href={{ uri: imageUrl }}
          x={piece.padding - piece.targetX}
          y={piece.padding - piece.targetY}
          width={boardWidth}
          height={boardHeight}
          preserveAspectRatio="none"
          clipPath={`url(#${clipId})`}
        />
        <Path d={piece.path} fill="none" stroke={colors.victoryGold} strokeWidth={2} />
      </Svg>
    </View>
  );
}

export default function JigsawBoard({ puzzle, onImageError }) {
  const [workspace, setWorkspace] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState(null);
  const [placedIds, setPlacedIds] = useState(() => new Set());
  const [page, setPage] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let isActive = true;
    setImageSize(null);
    setPlacedIds(new Set());
    setPage(0);

    Image.getSize(
      puzzle.imageURL,
      (width, height) => {
        if (isActive) setImageSize({ width, height });
      },
      () => {
        if (isActive) onImageError();
      },
    );

    return () => { isActive = false; };
  }, [onImageError, puzzle.imageURL]);

  const geometry = useMemo(() => {
    if (!imageSize || workspace.width <= 0 || workspace.height <= 0) return null;

    const trayWidth = Math.min(
      TRAY_MAX_WIDTH,
      Math.max(TRAY_MIN_WIDTH, workspace.width * 0.25),
    );
    const boardAreaWidth = workspace.width - trayWidth - WORKSPACE_GAP;
    const imageAspect = imageSize.width / imageSize.height;
    const boardWidth = Math.min(boardAreaWidth, workspace.height * imageAspect);
    const boardHeight = boardWidth / imageAspect;
    const boardX = (boardAreaWidth - boardWidth) / 2;
    const boardY = (workspace.height - boardHeight) / 2;
    const trayX = boardAreaWidth + WORKSPACE_GAP;
    const generated = createJigsawPieces({
      difficulty: puzzle.difficultyRecommended,
      boardWidth,
      boardHeight,
    });
    const trayHeaderHeight = TRAY_HEADER_HEIGHT;
    const availableTrayHeight = Math.max(1, workspace.height - trayHeaderHeight);
    const pieceRenderHeight = generated.pieces[0]?.renderHeight ?? availableTrayHeight;
    const pageCapacity = Math.max(1, Math.floor(availableTrayHeight / pieceRenderHeight));

    return {
      ...generated,
      boardX,
      boardY,
      boardWidth,
      boardHeight,
      trayX,
      trayWidth,
      trayHeaderHeight,
      pageCapacity,
    };
  }, [imageSize, puzzle.difficultyRecommended, workspace.height, workspace.width]);

  const unplacedPieces = useMemo(() => {
    if (!geometry) return [];
    return createTrayOrder(geometry.pieces).filter(({ id }) => !placedIds.has(id));
  }, [geometry, placedIds]);

  const pageCount = geometry
    ? Math.max(1, Math.ceil(unplacedPieces.length / geometry.pageCapacity))
    : 1;
  const safePage = Math.min(page, pageCount - 1);
  const visiblePieces = geometry
    ? unplacedPieces.slice(
      safePage * geometry.pageCapacity,
      (safePage + 1) * geometry.pageCapacity,
    )
    : [];

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const handleSettle = (pieceId, placed) => {
    setIsDragging(false);
    if (!placed) return;
    setPlacedIds((current) => new Set(current).add(pieceId));
  };

  if (!imageSize) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.neonCyan} />
        <Text style={styles.loadingText}>Preparing pieces...</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.workspace}
      onLayout={({ nativeEvent }) => setWorkspace(nativeEvent.layout)}
    >
      {geometry ? (
        <>
          <View
            style={[
              styles.board,
              shadows.glowCyan,
              {
                left: geometry.boardX,
                top: geometry.boardY,
                width: geometry.boardWidth,
                height: geometry.boardHeight,
              },
            ]}
          >
            <Image
              source={{ uri: puzzle.imageURL }}
              style={styles.boardGuideImage}
              resizeMode="stretch"
              onError={onImageError}
            />
            <Svg style={StyleSheet.absoluteFillObject}>
              {geometry.pieces.map((piece) => (
                <Path
                  key={piece.id}
                  d={piece.path}
                  transform={`translate(${piece.targetX - piece.padding} ${piece.targetY - piece.padding})`}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.24)"
                  strokeWidth={1}
                />
              ))}
            </Svg>
            {geometry.pieces.filter(({ id }) => placedIds.has(id)).map((piece) => (
              <PlacedPiece
                key={piece.id}
                piece={piece}
                imageUrl={puzzle.imageURL}
                boardWidth={geometry.boardWidth}
                boardHeight={geometry.boardHeight}
              />
            ))}
          </View>

          <View
            style={[
              styles.tray,
              {
                left: geometry.trayX,
                width: geometry.trayWidth,
                height: workspace.height,
              },
            ]}
          >
            <View style={styles.trayHeader}>
              <Text numberOfLines={1} style={styles.trayTitle}>{puzzle.imageName}</Text>
              <View style={styles.trayMetaRow}>
                <Text style={styles.progressText}>
                  {placedIds.size}/{geometry.pieceCount}
                </Text>
                <View style={styles.pageControls}>
                  <Pressable
                    accessibilityLabel="Previous piece page"
                    disabled={isDragging || safePage === 0}
                    onPress={() => setPage((current) => Math.max(0, current - 1))}
                    style={({ pressed }) => [
                      styles.pageButton,
                      (isDragging || safePage === 0) && styles.pageButtonDisabled,
                      pressed && styles.pageButtonPressed,
                    ]}
                  >
                    <Ionicons name="chevron-back" size={16} color={colors.white} />
                  </Pressable>
                  <Text style={styles.pageText}>{safePage + 1}/{pageCount}</Text>
                  <Pressable
                    accessibilityLabel="Next piece page"
                    disabled={isDragging || safePage >= pageCount - 1}
                    onPress={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                    style={({ pressed }) => [
                      styles.pageButton,
                      (isDragging || safePage >= pageCount - 1) && styles.pageButtonDisabled,
                      pressed && styles.pageButtonPressed,
                    ]}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {visiblePieces.map((piece, visibleIndex) => {
            const origin = {
              x: geometry.trayX + ((geometry.trayWidth - piece.cellWidth) / 2),
              y: geometry.trayHeaderHeight + (visibleIndex * piece.renderHeight) + piece.padding,
            };
            const target = {
              x: geometry.boardX + piece.targetX,
              y: geometry.boardY + piece.targetY,
            };

            return (
              <JigsawPiece
                key={piece.id}
                piece={piece}
                imageUrl={puzzle.imageURL}
                boardWidth={geometry.boardWidth}
                boardHeight={geometry.boardHeight}
                origin={origin}
                target={target}
                snapTolerance={getSnapTolerance(piece.cellWidth, piece.cellHeight)}
                onDragStart={() => setIsDragging(true)}
                onSettle={handleSettle}
              />
            );
          })}

          {placedIds.size === geometry.pieceCount ? (
            <View style={styles.completeBadge}>
              <Ionicons name="checkmark-circle" size={20} color={colors.victoryGold} />
              <Text style={styles.completeText}>Puzzle complete</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  workspace: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: typography.body,
    fontSize: 13,
  },
  board: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#080D18',
    borderWidth: 1.5,
    borderColor: colors.neonCyan,
    borderRadius: 8,
  },
  boardGuideImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.16,
  },
  placedPiece: {
    position: 'absolute',
    overflow: 'hidden',
  },
  tray: {
    position: 'absolute',
    top: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 8,
  },
  trayHeader: {
    height: TRAY_HEADER_HEIGHT,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  trayMetaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trayTitle: {
    color: colors.neonCyan,
    fontFamily: typography.subheading,
    fontSize: 10,
  },
  progressText: {
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 10,
  },
  pageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderRadius: 6,
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  pageButtonPressed: {
    backgroundColor: 'rgba(0,229,255,0.12)',
  },
  pageText: {
    minWidth: 24,
    color: colors.white,
    fontFamily: typography.body,
    fontSize: 9,
    textAlign: 'center',
  },
  completeBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    height: 36,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.victoryGold,
    borderRadius: 6,
  },
  completeText: {
    color: colors.white,
    fontFamily: typography.subheading,
    fontSize: 11,
  },
});