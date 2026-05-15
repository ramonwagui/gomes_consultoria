import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#1d7a7d' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="instrumentos"
        options={{
          title: 'Instrumentos',
          tabBarIcon: ({ color }) => <Ionicons name="documents-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatorios',
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="instrumento/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="instrumento/[id]/obra"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
