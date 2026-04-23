import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';

export interface OCRBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WordResult {
    text: string;
    box: OCRBox;
}

export interface OCRResult {
    text: string;
    box: OCRBox;
    words: WordResult[];
}

interface Props {
    imageUri: string;
    ocrData: OCRResult[];
    onTextPress?: (text: string) => void;
    onWordPress?: (text: string) => void;
    onSentencePress?: (text: string) => void;
}

export default function ImageOCRViewer({ imageUri, ocrData, onTextPress, onWordPress, onSentencePress }: Props) {
    const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
    const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!imageUri) return;

        if (Platform.OS === 'web' && imageUri.startsWith('blob:')) {
            // For web blob URLs, use an HTMLImageElement to get natural dimensions
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

    const toStyle = (box: OCRBox, zIndex: number, isSentence: boolean) => ({
        position: 'absolute' as const,
        left: box.x * scaleX + offsetX,
        top: box.y * scaleY + offsetY,
        width: box.width * scaleX,
        height: box.height * scaleY,
        backgroundColor: isSentence
            ? 'rgba(255, 140, 0, 0.10)'   // Outer: orange tint
            : 'rgba(0, 150, 255, 0.20)',   // Inner: blue tint
        borderColor: isSentence
            ? 'rgba(255, 140, 0, 0.85)'   // Outer: orange border
            : 'rgba(0, 150, 255, 0.85)',   // Inner: blue border
        borderWidth: isSentence ? 1.5 : 1,
        borderRadius: 4,
        zIndex,
    });

    return (
        <View style={styles.webContainer}>
            <View style={styles.container} onLayout={onLayout}>
                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />

                {originalSize.width > 0 && ocrData.map((item, si) => (
                    <React.Fragment key={`sentence-${si}`}>
                        {/* Outer sentence box — lower zIndex so word boxes sit on top */}
                        <TouchableOpacity
                            style={toStyle(item.box, 10, true)}
                            onPress={() => onSentencePress ? onSentencePress(item.text) : (onTextPress && onTextPress(item.text))}
                            activeOpacity={0.4}
                        />

                        {/* Inner word boxes */}
                        {item.words.map((word, wi) => (
                            <TouchableOpacity
                                key={`word-${si}-${wi}`}
                                style={toStyle(word.box, 20, false)}
                                onPress={() => onWordPress ? onWordPress(word.text) : (onTextPress && onTextPress(word.text))}
                                activeOpacity={0.4}
                            />
                        ))}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    webContainer: {
        flex: 1,
        width: '100%',
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
