import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Button,
    Alert,
} from "react-native";
import tw from "twrnc";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api";
import moment from "moment";

export default function SessionListScreen({ navigation }) {
    const [allSessions, setAllSessions] = useState([]);   // sve sesije sa servera
    const [sessions, setSessions] = useState([]);         // ono što se prikazuje
    const [loading, setLoading] = useState(false);        // inicijalni spinner
    const [refreshing, setRefreshing] = useState(false);  // pull-to-refresh
    const [date] = useState(() => new Date().toISOString().split("T")[0]);

    // Filteri
    const [location, setLocation] = useState("");
    const [teacher, setTeacher] = useState(null);
    const [course, setCourse] = useState(null);

    // Uniques
    const [uniqueLocations, setUniqueLocations] = useState([]);
    const [uniqueTeachers, setUniqueTeachers] = useState([]);
    const [uniqueCourses, setUniqueCourses] = useState([]);

    // Modals
    const [showLocModal, setShowLocModal] = useState(false);
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [showCourseModal, setShowCourseModal] = useState(false);

    const fetchSessions = async (skipLoader = false) => {
        if (!skipLoader) setLoading(true);
        try {
            const res = await api.post("/classSessions/filter", { date });
            const items = Array.isArray(res.data.original?.data)
                ? res.data.original.data
                : Array.isArray(res.data)
                    ? res.data
                    : [];
            setAllSessions(items);
            setSessions(items);
        } catch (err) {
            Alert.alert(
                "Greška",
                err.response?.data?.message || "Ne mogu da učitam termine."
            );
            setAllSessions([]);
            setSessions([]);
        } finally {
            if (!skipLoader) setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchSessions(true);
        setRefreshing(false);
    };

    const handleApplyFilter = () => {
        let filtered = allSessions;

        if (location) filtered = filtered.filter((s) => s.location === location);
        if (teacher) filtered = filtered.filter((s) => s.teacher?.id === teacher.id);
        if (course) filtered = filtered.filter((s) => s.course?.id === course.id);

        setSessions(filtered);
    };

    const handleClearFilter = () => {
        setLocation("");
        setTeacher(null);
        setCourse(null);
        setSessions(allSessions);
    };

    useEffect(() => {
        setUniqueLocations(
            Array.from(new Set(allSessions.map((s) => s.location || "Nepoznata")))
                .map((loc) => ({ value: loc, label: loc }))
        );

        const teacherMap = {};
        const courseMap = {};

        allSessions.forEach((s) => {
            if (s.teacher?.id) teacherMap[s.teacher.id] = s.teacher.full_name;
            if (s.course?.id) courseMap[s.course.id] = s.course.name;
        });

        setUniqueTeachers(
            Object.entries(teacherMap).map(([id, name]) => ({
                id: Number(id),
                full_name: name,
            }))
        );

        setUniqueCourses(
            Object.entries(courseMap).map(([id, name]) => ({
                id: Number(id),
                name,
            }))
        );
    }, [allSessions]);

    if (loading && allSessions.length === 0) {
        return (
            <ActivityIndicator style={tw`flex-1`} size="large" color="#FFA500" />
        );
    }

    const renderSession = ({ item }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate("ScanStudent", { classSessionId: item.id })}
            style={tw`mb-4`}
            activeOpacity={0.85}
        >
            <View style={tw`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm`}>
                <View style={tw`flex-row items-start justify-between`}>
                    <Text style={tw`text-base font-extrabold text-slate-900 flex-1 pr-3`}>
                        {item.course?.name || "Predmet"}
                    </Text>
                    <View style={tw`bg-orange-100 px-3 py-1 rounded-full`}>
                        <Text style={tw`text-orange-700 font-bold text-xs`}>
                            {moment(item.start_time, "H:m:i").format("H:mm")}
                        </Text>
                    </View>
                </View>

                <Text style={tw`text-slate-600 mt-2 font-semibold`}>
                    {moment(item.date).format("DD.MM.YYYY.")}{" "}
                    {moment(item.start_time, "H:m:i").format("H:mm")}–
                    {moment(item.end_time, "H:m:i").format("H:mm")}
                </Text>

                <View style={tw`flex-row flex-wrap mt-3 gap-2`}>
                    <View style={tw`flex-row items-center bg-slate-100 px-3 py-2 rounded-full`}>
                        <Ionicons name="location-outline" size={16} color="#334155" />
                        <Text style={tw`ml-2 text-slate-700 font-semibold`}>
                            {item.location || "Nepoznata"}
                        </Text>
                    </View>

                    <View style={tw`flex-row items-center bg-slate-100 px-3 py-2 rounded-full`}>
                        <Ionicons name="person-outline" size={16} color="#334155" />
                        <Text style={tw`ml-2 text-slate-700 font-semibold`}>
                            {item.teacher?.full_name || "—"}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            {/* Header + Filter panel */}
            <LinearGradient
                colors={["#1E3A8A", "#0F172A"]}
                style={tw`p-4 rounded-b-3xl`}
                start={[0, 0]}
                end={[1, 0]}
            >
                <Text style={tw`text-white text-lg font-bold`}>
                    {moment(date).format("DD.MM.YYYY.")}
                </Text>
                <Text style={tw`text-gray-200 text-sm mt-1 mb-3`}>
                    Izaberite filtere za termine
                </Text>

                <View style={tw`flex-row flex-wrap gap-2`}>
                    <TouchableOpacity
                        style={tw`bg-white/90 px-4 py-2 rounded-full`}
                        onPress={() => setShowCourseModal(true)}
                    >
                        <Text style={tw`text-gray-800 font-semibold`}>
                            📘 {course?.name || "Predmet"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={tw`bg-white/90 px-4 py-2 rounded-full`}
                        onPress={() => setShowTeacherModal(true)}
                    >
                        <Text style={tw`text-gray-800 font-semibold`}>
                            👨‍🏫 {teacher?.full_name || "Predavač"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={tw`bg-white/90 px-4 py-2 rounded-full`}
                        onPress={() => setShowLocModal(true)}
                    >
                        <Text style={tw`text-gray-800 font-semibold`}>
                            📍 {location || "Lokacija"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={tw`flex-row mt-4 gap-3`}>
                    <TouchableOpacity
                        onPress={handleApplyFilter}
                        style={tw`flex-1 bg-orange-500 py-3 rounded-xl flex-row justify-center items-center`}
                    >
                        <Ionicons name="search" size={18} color="#fff" />
                        <Text style={tw`text-white font-bold ml-2`}>Primeni</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleClearFilter}
                        style={tw`flex-1 border border-white/60 py-3 rounded-xl flex-row justify-center items-center`}
                    >
                        <Ionicons name="refresh" size={18} color="#fff" />
                        <Text style={tw`text-white font-bold ml-2`}>Reset</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Lista termina */}
            <FlatList
                contentContainerStyle={tw`p-4`}
                data={sessions}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderSession}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    !loading && (
                        <View style={tw`mt-10 items-center`}>
                            <Ionicons name="calendar-outline" size={34} color="#94A3B8" />
                            <Text style={tw`text-center mt-3 text-slate-500 font-semibold`}>
                                Nema termina za prikaz.
                            </Text>
                        </View>
                    )
                }
            />

            {/* Predmet modal */}
            <Modal visible={showCourseModal} transparent animationType="fade">
                <View style={tw`flex-1 justify-center bg-black/50`}>
                    <View style={tw`bg-white mx-6 p-6 rounded-2xl max-h-[70%]`}>
                        <Text style={tw`text-xl font-bold mb-4`}>Izaberi predmet</Text>

                        <FlatList
                            data={uniqueCourses}
                            keyExtractor={(i) => String(i.id)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={tw`py-3 border-b border-gray-200`}
                                    onPress={() => {
                                        setCourse(item);
                                        setShowCourseModal(false);
                                    }}
                                >
                                    <Text style={tw`text-gray-800 text-base`}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />

                        <Button title="Zatvori" onPress={() => setShowCourseModal(false)} />
                    </View>
                </View>
            </Modal>

            {/* Lokacija modal */}
            <Modal visible={showLocModal} transparent animationType="fade">
                <View style={tw`flex-1 justify-center bg-black/50`}>
                    <View style={tw`bg-white mx-6 p-6 rounded-2xl max-h-[70%]`}>
                        <Text style={tw`text-xl font-bold mb-4`}>Izaberi lokaciju</Text>

                        <FlatList
                            data={uniqueLocations}
                            keyExtractor={(i) => i.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={tw`py-3 border-b border-gray-200`}
                                    onPress={() => {
                                        setLocation(item.value);
                                        setShowLocModal(false);
                                    }}
                                >
                                    <Text style={tw`text-gray-800 text-base`}>{item.label}</Text>
                                </TouchableOpacity>
                            )}
                        />

                        <Button title="Zatvori" onPress={() => setShowLocModal(false)} />
                    </View>
                </View>
            </Modal>

            {/* Predavač modal */}
            <Modal visible={showTeacherModal} transparent animationType="fade">
                <View style={tw`flex-1 justify-center bg-black/50`}>
                    <View style={tw`bg-white mx-6 p-6 rounded-2xl max-h-[70%]`}>
                        <Text style={tw`text-xl font-bold mb-4`}>Izaberi predavača</Text>

                        <FlatList
                            data={uniqueTeachers}
                            keyExtractor={(i) => String(i.id)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={tw`py-3 border-b border-gray-200`}
                                    onPress={() => {
                                        setTeacher(item);
                                        setShowTeacherModal(false);
                                    }}
                                >
                                    <Text style={tw`text-gray-800 text-base`}>{item.full_name}</Text>
                                </TouchableOpacity>
                            )}
                        />

                        <Button title="Zatvori" onPress={() => setShowTeacherModal(false)} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}