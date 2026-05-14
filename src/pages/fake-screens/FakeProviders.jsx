import { AuthContext } from '../../store/AuthContext'
import { CollectionContext } from '../../store/CollectionContext'

export const FakeAuthProvider = ({ children, user }) => (
  <AuthContext.Provider value={{ user }}>
    {children}
  </AuthContext.Provider>
)

export const FakeCollectionProvider = ({
  children,
  username = 'mariorossi',
  missing = [],
  doubles = [],
  unreadChats = 1,
  chats = [],
  producerColors = {},   // passato dal screen dopo fetch, default vuoto
}) => {

  return (
    <CollectionContext.Provider value={{
      username,
      userCountry: 'IT',
      missing,
      doubles,
      loading: false,
      itemsLoading: false,
      refreshing: false,
      refreshCount: 0,
      producers: [],
      producerColors,
      unreadChats,
      setUnreadChats: () => {},
      chats,
      setChats: () => {},
      setActiveChatId: () => {},
      toggleMissing: async () => {},
      toggleDoubles: async () => {},
      addAllMissing: async () => {},
      refreshProfile: async () => {},
      refresh: async () => {},
    }}>
      {children}
    </CollectionContext.Provider>
  )
}

// Wraps a screen with the full fake auth + collection context
export const FakeProviders = ({ children, user, username, missing, doubles, unreadChats, chats }) => (
  <FakeAuthProvider user={user}>
    <FakeCollectionProvider username={username} missing={missing} doubles={doubles} unreadChats={unreadChats} chats={chats}>
      {children}
    </FakeCollectionProvider>
  </FakeAuthProvider>
)
