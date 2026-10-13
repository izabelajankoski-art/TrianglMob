import React, { useEffect, useState, useRef } from 'react';
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    ActivityIndicator,
    Pressable,
    Alert,
    RefreshControl,
    Linking,
    StatusBar,
    StyleSheet,
} from 'react-native';

import * as Clipboard from 'expo-clipboard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api';

const COLORS = {
    background: '#F5F6FA',
    white: '#FFFFFF',
    primary: '#6C63FF',
    primaryLight: '#EFEEFF',
    text: '#202238',
    secondaryText: '#777B91',
    border: '#E9EAF1',
    orange: '#F59E0B',
    orangeLight: '#FFF7E8',
    green: '#168568',
    greenLight: '#E9F7F1',
    red: '#D64545',
};

export default function MaterialsScreen({ route }) {
    const student = route.params.profile;
    const openMaterialId = route.params?.openMaterialId || null;

    const [groupedMaterials, setGroupedMaterials] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedCourse, setExpandedCourse] = useState(null);
    const [highlightedMaterialId, setHighlightedMaterialId] =
        useState(null);

    const scrollRef = useRef(null);

    const fetchMaterials = async () => {
        try {
            const res = await api.get(
                `/student/${student.id}/materials`
);

const enrollments = res.data?.enrollments || [];

const grouped = enrollments.reduce((groups, enrollment) => {
    const course = enrollment.course;

    if (
        !course ||
        !Array.isArray(course.materials) ||
        course.materials.length === 0
    ) {
        return groups;
    }

    const courseName = course.name || 'Nepoznat predmet';

    if (!groups[courseName]) {
        groups[courseName] = [];
    }

    groups[courseName].push(...course.materials);

    return groups;
}, {});

setGroupedMaterials(grouped);
} catch (error) {
    console.error(
        'Greska pri ucitavanju materijala:',
        error?.response?.data || error?.message || error
    );

    setGroupedMaterials({});

    Alert.alert(
        'Greska',
        'Materijali trenutno nisu dostupni. Pokusaj ponovo.'
    );
} finally {
    setLoading(false);
    setRefreshing(false);
}
};

useEffect(() => {
    fetchMaterials();
}, [student.id]);

// Automatski otvori predmet kada korisnik stigne iz notifikacije.
useEffect(() => {
    if (
        openMaterialId == null ||
        Object.keys(groupedMaterials).length === 0
    ) {
        return;
    }

    let foundCourseName = null;

    for (const [courseName, materials] of Object.entries(
        groupedMaterials
    )) {
        const match = materials.find(
            material =>
                String(material.id) === String(openMaterialId)
        );

        if (match) {
            foundCourseName = courseName;
            break;
        }
    }

    if (foundCourseName) {
        setExpandedCourse(foundCourseName);
        setHighlightedMaterialId(openMaterialId);

        const timeoutId = setTimeout(() => {
            scrollRef.current?.scrollTo({
                y: 200,
                animated: true,
            });
        }, 800);

        return () => clearTimeout(timeoutId);
    }
}, [openMaterialId, groupedMaterials]);

const onRefresh = () => {
    setRefreshing(true);
    setHighlightedMaterialId(null);
    fetchMaterials();
};

const copyToClipboard = async (url) => {
    try {
        if (typeof url !== 'string' || !url.trim()) {
            Alert.alert('Greska', 'Link nije dostupan.');
            return;
        }

        await Clipboard.setStringAsync(url.trim());

        Alert.alert(
            'Link kopiran',
            'Link ka materijalu je kopiran u klipbord.'
        );
    } catch (error) {
        console.error('Greska pri kopiranju linka:', error);

        Alert.alert(
            'Greska',
            'Link nije moguce kopirati. Pokusaj ponovo.'
        );
    }
};

const openLink = async (url) => {
    try {
        if (typeof url !== 'string' || !url.trim()) {
            Alert.alert('Greska', 'Link nije dostupan.');
            return;
        }

        const normalizedUrl = url.trim();

        if (!/^https?:\/\/\S+$/i.test(normalizedUrl)) {
            Alert.alert('Greska', 'Link nije validan.');
            return;
        }

        await Linking.openURL(normalizedUrl);
    } catch (error) {
        console.error('Greska pri otvaranju linka:', {
            url,
            message: error?.message,
            code: error?.code,
        });

        Alert.alert(
            'Greska',
            'Link nije moguce otvoriti. Pokusaj ponovo ili kopiraj link.'
        );
    }
};

const toggleExpand = (courseName) => {
    setExpandedCourse(previous =>
        previous === courseName ? null : courseName
    );
};

const courseEntries = Object.entries(groupedMaterials);

const totalMaterials = courseEntries.reduce(
    (total, [, materials]) => total + materials.length,
    0
);

return (
    <SafeAreaView style={styles.safeArea}>
        <StatusBar
            barStyle="dark-content"
            backgroundColor={COLORS.background}
        />

        {loading ? (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingIcon}>
                    <Ionicons
                        name="library-outline"
                        size={30}
                        color={COLORS.primary}
                    />
                </View>

                <ActivityIndicator
                    size="small"
                    color={COLORS.primary}
                    style={styles.loadingSpinner}
                />

                <Text style={styles.loadingText}>
                    Ucitavanje materijala...
                </Text>
            </View>
        ) : (
            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary}
                        colors={[COLORS.primary]}
                    />
                }
            >


                {/* Lista predmeta */}
                {courseEntries.length > 0 ? (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                Tvoji predmeti
                            </Text>

                            <Text style={styles.sectionSubtitle}>
                                Dodirni predmet za detalje
                            </Text>
                        </View>

                        {courseEntries.map(
                            ([courseName, materials], index) => {
                                const isExpanded =
                                    expandedCourse === courseName;

                                const hasHighlightedMaterial =
                                    materials.some(
                                        material =>
                                            String(material.id) ===
                                            String(highlightedMaterialId)
                                    );

                                const visibleMaterials = isExpanded
                                    ? materials
                                    : [materials[0]];

                                return (
                                    <View
                                        key={courseName}
                                        style={[
                                            styles.courseCard,
                                            isExpanded &&
                                            styles.expandedCourseCard,
                                        ]}
                                    >
                                        {/* Zaglavlje predmeta */}
                                        <Pressable
                                            onPress={() =>
                                                toggleExpand(courseName)
                                            }
                                            android_ripple={{
                                                color: '#F0EFFF',
                                            }}
                                            style={styles.courseHeader}
                                        >
                                            <View style={styles.courseIcon}>
                                                <Ionicons
                                                    name="book"
                                                    size={23}
                                                    color={COLORS.primary}
                                                />
                                            </View>

                                            <View
                                                style={
                                                    styles.courseInfo
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.courseEyebrow
                                                    }
                                                >
                                                    PREDMET {index + 1}
                                                </Text>

                                                <Text
                                                    style={
                                                        styles.courseTitle
                                                    }
                                                >
                                                    {courseName}
                                                </Text>

                                                <Text
                                                    style={
                                                        styles.courseCount
                                                    }
                                                >
                                                    {materials.length}{' '}
                                                    {materials.length === 1
                                                        ? 'materijal'
                                                        : 'materijala'}
                                                </Text>
                                            </View>

                                            <View
                                                style={
                                                    styles.expandIconContainer
                                                }
                                            >
                                                <Ionicons
                                                    name={
                                                        isExpanded
                                                            ? 'chevron-up'
                                                            : 'chevron-down'
                                                    }
                                                    size={20}
                                                    color={
                                                        COLORS.secondaryText
                                                    }
                                                />
                                            </View>
                                        </Pressable>

                                        {/* Sadrzaj predmeta */}
                                        {isExpanded && (
                                            <View
                                                style={
                                                    styles.courseContent
                                                }
                                            >
                                                <View
                                                    style={
                                                        styles.contentDivider
                                                    }
                                                />

                                                {materials.map(
                                                    (material) => {
                                                        const isHighlighted =
                                                            String(
                                                                material.id
                                                            ) ===
                                                            String(
                                                                highlightedMaterialId
                                                            );

                                                        return (
                                                            <View
                                                                key={
                                                                    material.id
                                                                }
                                                                style={[
                                                                    styles.materialCard,
                                                                    isHighlighted &&
                                                                    styles.highlightedMaterial,
                                                                ]}
                                                            >
                                                                <View
                                                                    style={
                                                                        styles.materialHeading
                                                                    }
                                                                >
                                                                    <View
                                                                        style={[
                                                                            styles.materialIcon,
                                                                            isHighlighted &&
                                                                            styles.highlightedMaterialIcon,
                                                                        ]}
                                                                    >
                                                                        <Ionicons
                                                                            name="document-text-outline"
                                                                            size={
                                                                                22
                                                                            }
                                                                            color={
                                                                                isHighlighted
                                                                                    ? COLORS.orange
                                                                                    : COLORS.primary
                                                                            }
                                                                        />
                                                                    </View>

                                                                    <View
                                                                        style={
                                                                            styles.materialTitleContainer
                                                                        }
                                                                    >
                                                                        <Text
                                                                            style={
                                                                                styles.materialTitle
                                                                            }
                                                                        >
                                                                            {material.title ||
                                                                                'Materijal bez naziva'}
                                                                        </Text>

                                                                        {isHighlighted && (
                                                                            <View
                                                                                style={
                                                                                    styles.newBadge
                                                                                }
                                                                            >
                                                                                <Text
                                                                                    style={
                                                                                        styles.newBadgeText
                                                                                    }
                                                                                >
                                                                                    Iz notifikacije
                                                                                </Text>
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                </View>

                                                                {material.description ? (
                                                                    <Text
                                                                        style={
                                                                            styles.materialDescription
                                                                        }
                                                                    >
                                                                        {
                                                                            material.description
                                                                        }
                                                                    </Text>
                                                                ) : null}

                                                                {material.file_url ? (
                                                                    <>
                                                                        <View
                                                                            style={
                                                                                styles.linkPreview
                                                                            }
                                                                        >


                                                                            <Text
                                                                                style={
                                                                                    styles.linkText
                                                                                }
                                                                                numberOfLines={
                                                                                    2
                                                                                }
                                                                                ellipsizeMode="middle"
                                                                            >
                                                                                {
                                                                                    material.file_url
                                                                                }
                                                                            </Text>
                                                                        </View>

                                                                        <View
                                                                            style={
                                                                                styles.actionRow
                                                                            }
                                                                        >
                                                                            <Pressable
                                                                                onPress={() =>
                                                                                    openLink(
                                                                                        material.file_url
                                                                                    )
                                                                                }
                                                                                android_ripple={{
                                                                                    color: '#E8E6FF',
                                                                                }}
                                                                                style={
                                                                                    styles.openButton
                                                                                }
                                                                            >
                                                                                <Ionicons
                                                                                    name="open-outline"
                                                                                    size={
                                                                                        18
                                                                                    }
                                                                                    color={
                                                                                        COLORS.white
                                                                                    }
                                                                                />

                                                                                <Text
                                                                                    style={
                                                                                        styles.openButtonText
                                                                                    }
                                                                                >
                                                                                    Otvori
                                                                                </Text>
                                                                            </Pressable>

                                                                            <Pressable
                                                                                onPress={() =>
                                                                                    copyToClipboard(
                                                                                        material.file_url
                                                                                    )
                                                                                }
                                                                                android_ripple={{
                                                                                    color: '#F0EFFF',
                                                                                }}
                                                                                style={
                                                                                    styles.copyButton
                                                                                }
                                                                            >
                                                                                <Ionicons
                                                                                    name="copy-outline"
                                                                                    size={
                                                                                        18
                                                                                    }
                                                                                    color={
                                                                                        COLORS.primary
                                                                                    }
                                                                                />

                                                                                <Text
                                                                                    style={
                                                                                        styles.copyButtonText
                                                                                    }
                                                                                >
                                                                                    Kopiraj link
                                                                                </Text>
                                                                            </Pressable>
                                                                        </View>
                                                                    </>
                                                                ) : (
                                                                    <View
                                                                        style={
                                                                            styles.unavailableBox
                                                                        }
                                                                    >
                                                                        <Ionicons
                                                                            name="alert-circle-outline"
                                                                            size={
                                                                                17
                                                                            }
                                                                            color={
                                                                                COLORS.red
                                                                            }
                                                                        />

                                                                        <Text
                                                                            style={
                                                                                styles.unavailableText
                                                                            }
                                                                        >
                                                                            Link nije
                                                                            dostupan.
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        );
                                                    }
                                                )}

                                                {materials.length > 1 && (
                                                    <Pressable
                                                        onPress={() =>
                                                            toggleExpand(
                                                                courseName
                                                            )
                                                        }
                                                        style={
                                                            styles.collapseButton
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.collapseButtonText
                                                            }
                                                        >
                                                            Prikazi manje
                                                        </Text>

                                                        <Ionicons
                                                            name="chevron-up"
                                                            size={16}
                                                            color={
                                                                COLORS.primary
                                                            }
                                                        />
                                                    </Pressable>
                                                )}
                                            </View>
                                        )}

                                        {/* Prikaz prvog materijala kada je predmet zatvoren */}
                                        {!isExpanded && (
                                            <View
                                                style={
                                                    styles.collapsedPreview
                                                }
                                            >
                                                <View
                                                    style={
                                                        styles.previewDivider
                                                    }
                                                />



                                                {hasHighlightedMaterial && (
                                                    <Text
                                                        style={
                                                            styles.notificationHint
                                                        }
                                                    >
                                                        Predmet sadrzi
                                                        materijal iz
                                                        notifikacije.
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                );
                            }
                        )}
                    </>
                ) : (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIcon}>
                            <Ionicons
                                name="folder-open-outline"
                                size={35}
                                color={COLORS.primary}
                            />
                        </View>

                        <Text style={styles.emptyTitle}>
                            Jos nema materijala
                        </Text>

                        <Text style={styles.emptyDescription}>
                            Kada materijali budu dostupni, pojavice se
                            ovde, organizovani po predmetima.
                        </Text>
                    </View>
                )}

                <Text style={styles.footerText}>
                    Tvoji materijali · Sve na jednom mestu
                </Text>
            </ScrollView>
        )}
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 36,
    },

    // Zaglavlje
    header: {
        marginBottom: 22,
    },

    headerIcon: {
        width: 54,
        height: 54,
        borderRadius: 18,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },

    pageTitle: {
        fontSize: 27,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.7,
    },

    pageSubtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: COLORS.secondaryText,
        marginTop: 7,
        maxWidth: 310,
    },

    // Statistika
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 15,
        marginBottom: 29,
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    summaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },

    summaryIcon: {
        width: 43,
        height: 43,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 11,
    },

    summaryNumber: {
        fontSize: 21,
        fontWeight: '800',
        color: COLORS.text,
    },

    summaryLabel: {
        fontSize: 12,
        color: COLORS.secondaryText,
        marginTop: 2,
    },

    summaryDivider: {
        width: 1,
        height: 39,
        backgroundColor: COLORS.border,
        marginHorizontal: 12,
    },

    // Sekcija predmeta
    sectionHeader: {
        marginBottom: 15,
    },

    sectionTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: COLORS.text,
    },

    sectionSubtitle: {
        fontSize: 12,
        color: COLORS.secondaryText,
        marginTop: 4,
    },

    // Kartica predmeta
    courseCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',

        shadowColor: '#252544',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.045,
        shadowRadius: 8,
        elevation: 2,
    },

    expandedCourseCard: {
        borderColor: '#DCD9FF',
        borderWidth: 1.3,
    },

    courseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        minHeight: 96,
    },

    courseIcon: {
        width: 51,
        height: 51,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 13,
    },

    courseInfo: {
        flex: 1,
        paddingRight: 8,
    },

    courseEyebrow: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: 1.1,
        marginBottom: 5,
    },

    courseTitle: {
        fontSize: 16,
        fontWeight: '750',
        color: COLORS.text,
        lineHeight: 21,
    },

    courseCount: {
        fontSize: 12,
        color: COLORS.secondaryText,
        marginTop: 5,
    },

    expandIconContainer: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: '#F6F6FA',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Sadrzaj predmeta
    courseContent: {
        paddingHorizontal: 14,
        paddingBottom: 14,
    },

    contentDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 14,
    },

    // Kartica materijala
    materialCard: {
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#FAFAFD',
        borderWidth: 1,
        borderColor: '#EEEEF5',
        marginBottom: 12,
    },

    highlightedMaterial: {
        backgroundColor: COLORS.orangeLight,
        borderColor: '#F4C46F',
        borderWidth: 1.5,
    },

    materialHeading: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 11,
    },

    materialIcon: {
        width: 41,
        height: 41,
        borderRadius: 13,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 11,
    },

    highlightedMaterialIcon: {
        backgroundColor: '#FFEDC7',
    },

    materialTitleContainer: {
        flex: 1,
        paddingTop: 2,
    },

    materialTitle: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '700',
        color: COLORS.text,
    },

    newBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFEDC7',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 4,
        marginTop: 6,
    },

    newBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9A5B00',
    },

    materialDescription: {
        fontSize: 13,
        lineHeight: 20,
        color: COLORS.secondaryText,
        marginBottom: 12,
    },

    // Link
    linkPreview: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 10,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
    },

    linkText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 16,
        color: COLORS.secondaryText,
        marginLeft: 7,
    },

    // Dugmad
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    openButton: {
        flex: 1,
        minHeight: 45,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        marginRight: 8,
        paddingHorizontal: 8,
        overflow: 'hidden',
    },

    openButtonText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 7,
    },

    copyButton: {
        flex: 1,
        minHeight: 45,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DCD9FF',
        paddingHorizontal: 8,
        overflow: 'hidden',
    },

    copyButtonText: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 7,
    },

    unavailableBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F1',
        padding: 10,
        borderRadius: 10,
    },

    unavailableText: {
        fontSize: 12,
        color: COLORS.red,
        marginLeft: 7,
    },

    collapseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },

    collapseButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.primary,
        marginRight: 6,
    },

    // Zatvoren predmet
    collapsedPreview: {
        paddingHorizontal: 16,
        paddingBottom: 14,
    },

    previewDivider: {
        height: 1,
        backgroundColor: '#F0F0F5',
        marginBottom: 12,
    },

    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    previewTitle: {
        flex: 1,
        fontSize: 12,
        color: COLORS.secondaryText,
        marginHorizontal: 8,
    },

    notificationHint: {
        fontSize: 11,
        color: '#9A5B00',
        marginTop: 9,
    },

    // Prazno stanje
    emptyCard: {
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 22,
        paddingHorizontal: 25,
        paddingVertical: 35,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginTop: 8,
    },

    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        textAlign: 'center',
    },

    emptyDescription: {
        fontSize: 13,
        lineHeight: 21,
        color: COLORS.secondaryText,
        textAlign: 'center',
        marginTop: 9,
    },

    // Ucitavanje
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    loadingIcon: {
        width: 70,
        height: 70,
        borderRadius: 23,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },

    loadingSpinner: {
        marginBottom: 12,
    },

    loadingText: {
        fontSize: 13,
        color: COLORS.secondaryText,
    },

    footerText: {
        textAlign: 'center',
        fontSize: 11,
        color: '#A0A2B3',
        marginTop: 14,
        marginBottom: 8,
    },
});
