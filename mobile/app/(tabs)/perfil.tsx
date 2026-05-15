import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { toAbsoluteApiUrl } from '@/config/api';
import { useAuthApi } from '@/hooks/use-auth-api';
import { useAuth } from '../../store/AuthContext';

type ProfileResponse = {
  nome: string;
  email: string;
  avatar_url: string | null;
};

export default function PerfilScreen() {
  const { signOut, userToken } = useAuth();
  const { authApiFetch } = useAuthApi();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!userToken) {
        if (isMounted) {
          setProfile(null);
          setIsLoadingProfile(false);
        }
        return;
      }

      setIsLoadingProfile(true);

      try {
        const data = (await authApiFetch('/usuarios/me')) as ProfileResponse;
        if (!isMounted) {
          return;
        }

        setProfile(data);
        setAvatarFailed(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error('Falha ao carregar perfil do usuario', error);
        setProfile(null);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [authApiFetch, userToken]);

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const displayName = profile?.nome?.trim() || 'Usuario Gestconv360';
  const displayEmail = profile?.email?.trim() || 'Acesso autenticado';
  const avatarLetter = displayName.charAt(0).toUpperCase() || 'U';
  const avatarUri = profile?.avatar_url ? toAbsoluteApiUrl(profile.avatar_url) : null;
  const shouldShowAvatarImage = Boolean(avatarUri) && !avatarFailed;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          {isLoadingProfile ? (
            <ActivityIndicator color="#ffffff" />
          ) : shouldShowAvatarImage ? (
            <Image
              source={{ uri: avatarUri! }}
              style={styles.avatarImage}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          )}
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{displayEmail}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#edf5fb',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1d7a7d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#113451',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#4e647b',
  },
  logoutButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#9b2c2c',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#9b2c2c',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
