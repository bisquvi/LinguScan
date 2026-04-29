import React, { useState, useEffect, useRef } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, LayoutChangeEvent, Platform, PanResponder } from 'react-native';
import { OCRBox, OCRResult, ViewMode, WordResult } from '../types/ocr';

interface Props {
    imageUri: string;
    ocrData: OCRResult[];
    onTextPress?: (text: string) => void;
    onWordPress?: (text: string) => void;
    onSentencePress?: (text: string) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    zoomScale?: number;
}

export default function ImageOCRViewer({
    imageUri, ocrData, onTextPress, onWordPress, onSentencePress,
    viewMode, onViewModeChange, zoomScale = 1
}: Props) {
    const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
    const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const panRef = useRef({ x: 0, y: 0 });
    const panStartRef = useRef({ x: 0, y: 0 });
    const zoomScaleRef = useRef(zoomScale);
    const displaySizeRef = useRef(displaySize);

    useEffect(() => { zoomScaleRef.current = zoomScale; }, [zoomScale]);
    useEffect(() => { displaySizeRef.current = displaySize; }, [displaySize]);
    useEffect(() => { panRef.current = pan; }, [pan]);

    useEffect(() => {
        if (zoomScale <= 1) {
            setPan({ x: 0, y: 0 });
        } else {
            const maxPanX = (displaySize.width * (zoomScale - 1)) / 2;
            const maxPanY = (displaySize.height * (zoomScale - 1)) / 2;
            setPan(prev => ({
                x: Math.min(Math.max(prev.x, -maxPanX), maxPanX),
                y: Math.min(Math.max(prev.y, -maxPanY), maxPanY)
            }));
        }
    }, [zoomScale, displaySize]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                return zoomScaleRef.current > 1 && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5);
            },
            onPanResponderGrant: () => {
                panStartRef.current = { ...panRef.current };
                setIsDragging(true);
            },
            onPanResponderMove: (evt, gestureState) => {
                const zScale = zoomScaleRef.current;
                if (zScale > 1) {
                    const dSize = displaySizeRef.current;
                    const maxPanX = (dSize.width * (zScale - 1)) / 2;
                    const maxPanY = (dSize.height * (zScale - 1)) / 2;
                    
                    let newX = panStartRef.current.x + gestureState.dx;
                    let newY = panStartRef.current.y + gestureState.dy;

                    newX = Math.min(Math.max(newX, -maxPanX), maxPanX);
                    newY = Math.min(Math.max(newY, -maxPanY), maxPanY);

                    setPan({ x: newX, y: newY });
                }
            },
            onPanResponderRelease: () => {
                setIsDragging(false);
            },
            onPanResponderTerminate: () => {
                setIsDragging(false);
            }
        })
    ).current;

    useEffect(() => {
        if (!imageUri) return;

        // Reset so stale scale factors don't position old boxes on the new image
        setOriginalSize({ width: 0, height: 0 });

        if (Platform.OS === 'web' && imageUri.startsWith('blob:')) {
            const img = new (window as any).Image();
            img.onload = () => setOriginalSize({ width: img.naturalWidth, height: img.naturalHeight });
            img.src = imageUri;
        } else if (Platform.OS === 'web' && imageUri.startsWith('data:')) {
            const img = new (window as any).Image();
            img.onload = () => setOriginalSize({ width: img.naturalWidth, height: img.naturalHeight });
            img.src = imageUri;
        } else {
            Image.getSize(imageUri, (width, height) => {
                setOriginalSize({ width, height });
            });
        }
    }, [imageUri]);

    const onLayout = (event: LayoutChangeEvent) => {
        setDisplaySize({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
        });
    };

    // Calculate scaling factors and letterbox offsets
    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (originalSize.width > 0 && originalSize.height > 0 && displaySize.width > 0 && displaySize.height > 0) {
        const parentRatio = displaySize.width / displaySize.height;
        const imageRatio = originalSize.width / originalSize.height;

        if (imageRatio > parentRatio) {
            scaleX = displaySize.width / originalSize.width;
            scaleY = scaleX;
            const actualDisplayedHeight = originalSize.height * scaleY;
            offsetY = (displaySize.height - actualDisplayedHeight) / 2;
        } else {
            scaleY = displaySize.height / originalSize.height;
            scaleX = scaleY;
            const actualDisplayedWidth = originalSize.width * scaleX;
            offsetX = (displaySize.width - actualDisplayedWidth) / 2;
        }
    }

    const toStyle = (box: OCRBox, zIndex: number, type: 'word' | 'sentence' | 'fulltext') => ({
        position: 'absolute' as const,
        left: box.x * scaleX + offsetX,
        top: box.y * scaleY + offsetY,
        width: box.width * scaleX,
        height: box.height * scaleY,
        backgroundColor:
            type === 'sentence'
                ? 'rgba(255, 140, 0, 0.10)'
                : type === 'fulltext'
                    ? 'rgba(29, 185, 84, 0.10)'
                    : 'rgba(0, 150, 255, 0.20)',
        borderColor:
            type === 'sentence'
                ? 'rgba(255, 140, 0, 0.85)'
                : type === 'fulltext'
                    ? 'rgba(29, 185, 84, 0.85)'
                    : 'rgba(0, 150, 255, 0.85)',
        borderWidth: type === 'word' ? 1 : 1.5,
        borderRadius: 4,
        zIndex,
    });

    // Group words into lines by Y proximity, return per-line bounding boxes
    const getSentenceLineBoxes = (item: OCRResult): OCRBox[] => {
        if (item.words.length === 0) return [item.box];

        const sorted = [...item.words].sort((a, b) => a.box.y - b.box.y);
        const lines: WordResult[][] = [];

        for (const word of sorted) {
            const lastLine = lines[lines.length - 1];
            if (lastLine) {
                const avgH = lastLine.reduce((s, w) => s + w.box.height, 0) / lastLine.length;
                if (Math.abs(word.box.y - lastLine[0].box.y) < avgH * 0.6) {
                    lastLine.push(word);
                    continue;
                }
            }
            lines.push([word]);
        }

        const pad = 3;
        return lines.map(lw => {
            const minX = Math.min(...lw.map(w => w.box.x)) - pad;
            const minY = Math.min(...lw.map(w => w.box.y)) - pad;
            const maxX = Math.max(...lw.map(w => w.box.x + w.box.width)) + pad;
            const maxB = Math.max(...lw.map(w => w.box.y + w.box.height)) + pad;
            return { x: Math.max(0, minX), y: Math.max(0, minY), width: maxX - minX, height: maxB - minY };
        });
    };

    // Compute merged bounding box for fulltext mode
    const getFullTextBox = (): OCRBox | null => {
        if (ocrData.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxR = -Infinity, maxB = -Infinity;
        for (const item of ocrData) {
            minX = Math.min(minX, item.box.x);
            minY = Math.min(minY, item.box.y);
            maxR = Math.max(maxR, item.box.x + item.box.width);
            maxB = Math.max(maxB, item.box.y + item.box.height);
        }
        const padding = 8;
        return {
            x: Math.max(0, minX - padding),
            y: Math.max(0, minY - padding),
            width: (maxR - minX) + padding * 2,
            height: (maxB - minY) + padding * 2,
        };
    };

    const fullText = ocrData.map(item => item.text).join(' ');

    return (
        <View style={styles.outerWrapper}>
            {/* ── Left Filter Buttons ──────────────────── */}
            <View style={styles.filterPanel}>
                <TouchableOpacity
                    style={[
                        styles.filterBtn,
                        viewMode === 'words' && styles.filterBtnActiveWords,
                    ]}
                    onPress={() => onViewModeChange('words')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.filterIcon}>🔤</Text>
                    <Text style={[
                        styles.filterLabel,
                        viewMode === 'words' && styles.filterLabelActive,
                    ]}>Kelimeler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterBtn,
                        viewMode === 'sentences' && styles.filterBtnActiveSentences,
                    ]}
                    onPress={() => onViewModeChange('sentences')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.filterIcon}>📝</Text>
                    <Text style={[
                        styles.filterLabel,
                        viewMode === 'sentences' && styles.filterLabelActive,
                    ]}>Cümleler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterBtn,
                        viewMode === 'fulltext' && styles.filterBtnActiveFulltext,
                    ]}
                    onPress={() => onViewModeChange('fulltext')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.filterIcon}>📄</Text>
                    <Text style={[
                        styles.filterLabel,
                        viewMode === 'fulltext' && styles.filterLabelActive,
                    ]}>Bütün Metin</Text>
                </TouchableOpacity>
            </View>

            {/* ── Image + OCR Overlay ──────────────────── */}
            <View style={styles.webContainer}>
                <View 
                    style={[
                        styles.container, 
                        Platform.OS === 'web' && zoomScale > 1 ? { cursor: isDragging ? 'grabbing' : 'grab' } as any : {}
                    ]} 
                    onLayout={onLayout} 
                    {...panResponder.panHandlers}
                >
                    <View style={{ width: '100%', height: '100%', transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: zoomScale }] }}>
                        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />

                    {originalSize.width > 0 && viewMode === 'words' && ocrData.map((item, si) => (
                        <React.Fragment key={`words-${si}`}>
                            {item.words.map((word, wi) => (
                                <TouchableOpacity
                                    key={`word-${si}-${wi}`}
                                    style={toStyle(word.box, 20, 'word')}
                                    onPress={() => onWordPress ? onWordPress(word.text) : (onTextPress && onTextPress(word.text))}
                                    activeOpacity={0.4}
                                />
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Sentences: per-line segment boxes instead of one big rectangle */}
                    {originalSize.width > 0 && viewMode === 'sentences' && ocrData.map((item, si) => {
                        const lineBoxes = getSentenceLineBoxes(item);
                        return (
                            <React.Fragment key={`sentence-${si}`}>
                                {lineBoxes.map((lineBox, li) => (
                                    <TouchableOpacity
                                        key={`sline-${si}-${li}`}
                                        style={toStyle(lineBox, 10, 'sentence')}
                                        onPress={() => onSentencePress ? onSentencePress(item.text) : (onTextPress && onTextPress(item.text))}
                                        activeOpacity={0.4}
                                    />
                                ))}
                            </React.Fragment>
                        );
                    })}

                    {originalSize.width > 0 && viewMode === 'fulltext' && (() => {
                        const box = getFullTextBox();
                        if (!box) return null;
                        return (
                            <TouchableOpacity
                                style={toStyle(box, 10, 'fulltext')}
                                onPress={() => onSentencePress ? onSentencePress(fullText) : (onTextPress && onTextPress(fullText))}
                                activeOpacity={0.4}
                            />
                        );
                    })()}
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerWrapper: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
    },
    filterPanel: {
        width: 90,
        backgroundColor: '#1a1a1a',
        paddingVertical: 16,
        paddingHorizontal: 6,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        borderRightWidth: 1,
        borderRightColor: '#2a2a2a',
    },
    filterBtn: {
        width: 78,
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#252525',
        borderWidth: 1.5,
        borderColor: '#333',
    },
    filterBtnActiveWords: {
        backgroundColor: 'rgba(0, 150, 255, 0.15)',
        borderColor: 'rgba(0, 150, 255, 0.85)',
    },
    filterBtnActiveSentences: {
        backgroundColor: 'rgba(255, 140, 0, 0.15)',
        borderColor: 'rgba(255, 140, 0, 0.85)',
    },
    filterBtnActiveFulltext: {
        backgroundColor: 'rgba(29, 185, 84, 0.15)',
        borderColor: 'rgba(29, 185, 84, 0.85)',
    },
    filterIcon: {
        fontSize: 22,
        marginBottom: 4,
    },
    filterLabel: {
        fontSize: 10,
        color: '#888',
        fontWeight: '600',
        textAlign: 'center',
    },
    filterLabelActive: {
        color: '#fff',
    },
    webContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 800 : '100%',
        maxHeight: Platform.OS === 'web' ? 800 : '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#1e1e1e',
        borderRadius: Platform.OS === 'web' ? 10 : 0,
    },
    image: {
        width: '100%',
        height: '100%',
        zIndex: 1,
    },
});
