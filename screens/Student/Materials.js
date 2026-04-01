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
    Linking
} from 'react-native';
import tw from 'twrnc';
import * as Clipboard from 'expo-clipboard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api';

export default function MaterialsScreen({ route }) {
    const student = route.params.profile;
    const openMaterialId = route.params?.openMaterialId || null;
    const [groupedMaterials, setGroupedMaterials] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedCourse, setExpandedCourse] = useState(null);
    const [highlightedMaterialId, setHighlightedMaterialId] = useState(null);

    const scrollRef = useRef(null);

    const fetchMaterials = async () => {
        try {
            const res = await api.get(`/student/${student.id}/materials`);
            const enrollments = res.data?.enrollments || [];

            const grouped = enrollments.reduce((groups, enrollment) => {
                const course = enrollment.course;
                if (!course || !course.materials || course.materials.length === 0) return groups;

                const courseName = course.name || 'Nepoznat kurs';
                if (!groups[courseName]) groups[courseName] = [];

                course.materials.forEach(material => {
                    groups[courseName].push(material);
                });

                return groups;
            }, {});

            setGroupedMaterials(grouped);
        } catch (error) {
            console.error('Greška pri učitavanju materijala:', error);
            setGroupedMaterials({});
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, [student.id]);

    // 🔹 Ako dobijemo openMaterialId iz notifikacije
    useEffect(() => {
        if (!openMaterialId || !Object.keys(groupedMaterials).length) return;

        let foundCourseName = null;
        for (const [courseName, materials] of Object.entries(groupedMaterials)) {
            const match = materials.find(m => m.id === openMaterialId);
            if (match) {
                foundCourseName = courseName;
                break;
            }
        }

        if (foundCourseName) {
            setExpandedCourse(foundCourseName);
            setHighlightedMaterialId(openMaterialId);

            // kratki delay da ScrollView renderuje sve pa skrolujemo do označenog
            setTimeout(() => {
                const y = 200; // možeš prilagoditi visinu skrola
                scrollRef.current?.scrollTo({ y, animated: true });
            }, 800);
        }
    }, [openMaterialId, groupedMaterials]);

    const onRefresh = () => {


        setRefreshing(true);
        setHighlightedMaterialId(null);
        fetchMaterials();
    };

    const copyToClipboard = async (text) => {
        await Clipboard.setStringAsync(text);
        Alert.alert('Link kopiran', 'Link ka materijalu je kopiran u klipbord.');
    };

    const openLink = async (url) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Greška', 'Ne mogu da otvorim link.');
            }
        } catch (err) {
            console.error('Greška pri otvaranju linka:', err);
            Alert.alert('Greška', 'Došlo je do problema pri otvaranju linka.');
        }
    };

    const toggleExpand = (courseName) => {
        setExpandedCourse(prev => (prev === courseName ? null : courseName));
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            {loading ? (
                <ActivityIndicator size="large" color="#F59E0B" style={tw`mt-10`} />
            ) : (
                <ScrollView
                    ref={scrollRef}
                    style={tw`px-4 mt-4`}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {Object.keys(groupedMaterials).length > 0 ? (
                        Object.entries(groupedMaterials).map(([courseName, materials]) => (
                            <View
                                key={courseName}
                                style={tw`${expandedCourse === courseName ? 'bg-orange-50' : ''} mb-6 p-2 rounded-lg`}
                            >
                                <Text style={tw`text-lg font-bold text-gray-700 mb-2`}>
                                    Kurs {courseName}
                                </Text>

                                <Pressable
                                    onPress={() => toggleExpand(courseName)}
                                    style={tw`bg-black px-2 py-1 rounded self-start mb-3`}
                                >
                                    <Text style={tw`text-white font-semibold`}>
                                        {expandedCourse === courseName ? 'Sakrij' : 'Vidi sve'}
                                    </Text>
                                </Pressable>

                                {(expandedCourse === courseName ? materials : [materials[0]]).map((material) => {
                                    const isHighlighted = material.id === highlightedMaterialId;

                                    return (
                                        <View
                                            key={material.id}
                                            style={tw`
                                                mb-4 p-4 rounded-xl shadow-lg
                                                ${isHighlighted ? 'bg-yellow-100 border-2 border-[#FFA500]' : 'bg-white'}
                                            `}
                                        >
                                            <Text style={tw`text-lg font-semibold text-gray-800 mb-2`}>
                                                {material.title}
                                            </Text>

                                            {material.description && (
                                                <Text style={tw`text-sm text-gray-600 mb-3`}>
                                                    {material.description}
                                                </Text>
                                            )}

                                            {material.file_url ? (
                                                <View style={tw`flex-row items-center`}>
                                                    <Pressable
                                                        onPress={() => openLink(material.file_url)}
                                                        style={tw`flex-1`}
                                                    >
                                                        <Text
                                                            style={tw`text-blue-600 underline`}
                                                            numberOfLines={1}
                                                        >
                                                            {material.file_url}
                                                        </Text>
                                                    </Pressable>

                                                    <Pressable
                                                        onPress={() => copyToClipboard(material.file_url)}
                                                        style={tw`ml-2`}
                                                    >
                                                        <Ionicons
                                                            name="copy-outline"
                                                            size={20}
                                                            color="#FF8C00"
                                                        />
                                                    </Pressable>
                                                </View>
                                            ) : (
                                                <Text style={tw`text-red-500 italic`}>
                                                    Link nije dostupan.
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))
                    ) : (
                        <Text style={tw`text-center text-gray-500 mt-8`}>
                            Nema dostupnih materijala.
                        </Text>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
