import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../../store/authSlice'
import {
  Navbar,
  Nav,
  Container,
  Offcanvas,
  Dropdown,
  Badge,
  Button,
  Modal,
  Toast,
  ToastContainer
} from 'react-bootstrap'
import {
  FiHome, FiPackage, FiTrendingDown, FiActivity,
  FiUsers, FiFileText, FiSettings, FiLogOut,
  FiBell, FiUser, FiCommand, FiSun, FiMoon,
  FiHelpCircle
} from 'react-icons/fi'

// Composant séparé pour le modal des raccourcis
const ShortcutsModal = ({ show, onHide }) => (
  <Modal show={show} onHide={onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title><FiCommand className="me-2" /> Raccourcis clavier</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <table className="table table-sm">
        <tbody>
          <tr><td><kbd>⌘</kbd> + <kbd>K</kbd></td><td>Ouvrir le menu</td></tr>
          <tr><td><kbd>⌘</kbd> + <kbd>B</kbd></td><td>Basculer la sidebar</td></tr>
          <tr><td><kbd>⌘</kbd> + <kbd>D</kbd></td><td>Tableau de bord</td></tr>
          <tr><td><kbd>⌘</kbd> + <kbd>A</kbd></td><td>Liste des actifs</td></tr>
          <tr><td><kbd>⌘</kbd> + <kbd>N</kbd></td><td>Nouvel actif</td></tr>
          <tr><td><kbd>⌘</kbd> + <kbd>/</kbd></td><td>Aide</td></tr>
          <tr><td><kbd>ESC</kbd></td><td>Fermer les modals</td></tr>
        </tbody>
      </table>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" size="sm" onClick={onHide}>Fermer</Button>
    </Modal.Footer>
  </Modal>
)

const BootstrapLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    // Charger le thème depuis localStorage
    const saved = localStorage.getItem('darkMode')
    return saved ? saved === 'true' : false
  })
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [greeting, setGreeting] = useState('')
  const [toastMessage, setToastMessage] = useState(null)

  // Menu items
  const menuItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: <FiHome />, roles: ['admin', 'comptable', 'auditeur'], shortcut: 'd' },
    { path: '/actifs', label: 'Actifs', icon: <FiPackage />, roles: ['admin', 'comptable'], shortcut: 'a' },
    { path: '/audit', label: 'Audit', icon: <FiActivity />, roles: ['admin', 'auditeur'], shortcut: null },
    { path: '/utilisateurs', label: 'Utilisateurs', icon: <FiUsers />, roles: ['admin'], shortcut: null },
    { path: '/contrats', label: 'Contrats', icon: <FiFileText />, roles: ['admin', 'juridique'], shortcut: null },
    { path: '/parametres', label: 'Paramètres', icon: <FiSettings />, roles: ['admin', 'comptable'], shortcut: null },
    { path: '/rapports', label: 'Rapports', icon: <FiTrendingDown />, roles: ['admin', 'comptable', 'auditeur'], shortcut: null },
  ]

  // Filtrer selon rôle + redirection si aucun accès
  const userRole = user?.role || null
  const filteredMenu = userRole ? menuItems.filter(item => item.roles.includes(userRole)) : []

  // Redirection si utilisateur non connecté ou rôle invalide
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  // Sauvegarder le thème dans localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // Heure et message
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hour = now.getHours()
      if (hour < 12) setGreeting('Bonjour')
      else if (hour < 18) setGreeting('Bon après-midi')
      else setGreeting('Bonsoir')
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Notifications mockées avec marquage comme lu
  useEffect(() => {
    setNotifications([
      { id: 1, message: '3 licences expirent dans 30 jours', type: 'warning', read: false, date: new Date() },
      { id: 2, message: 'Nouvel actif ajouté', type: 'info', read: false, date: new Date() }
    ])
  }, [])

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    )
    setToastMessage({ text: 'Toutes les notifications ont été marquées comme lues', type: 'success' })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/rapports' && location.pathname.startsWith('/rapports')) return true
    if (path === '/parametres' && location.pathname.startsWith('/parametres')) return true
    return location.pathname === path
  }

  // Fermer la sidebar sur grand écran
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Raccourcis clavier améliorés
  useEffect(() => {
    const handleKeyDown = (e) => {
      const modKey = e.ctrlKey || e.metaKey
      
      if (modKey && e.key === 'k') {
        e.preventDefault()
        setSidebarOpen(true)
      }
      if (modKey && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }
      if (modKey && e.key === '/') {
        e.preventDefault()
        setShowShortcuts(true)
      }
      if (modKey && e.key === 'd') {
        e.preventDefault()
        navigate('/dashboard')
      }
      if (modKey && e.key === 'a') {
        e.preventDefault()
        navigate('/actifs')
      }
      if (modKey && e.key === 'n') {
        e.preventDefault()
        navigate('/actifs/nouveau')
        setToastMessage({ text: 'Nouvel actif - formulaire ouvert', type: 'info' })
        setTimeout(() => setToastMessage(null), 2000)
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false)
        setShowNotifications(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  if (!user) {
    return null // ou un loader
  }

  return (
    <div style={{ backgroundColor: darkMode ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }}>
      {/* Navbar fixe en haut */}
      <Navbar bg={darkMode ? 'dark' : 'light'} variant={darkMode ? 'dark' : 'light'} fixed="top" className="shadow-sm">
        <Container fluid>
          <Navbar.Brand 
            role="button" 
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
          >
            <strong>🇨🇩 BCC Gestion</strong>
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="offcanvasNavbar" onClick={() => setSidebarOpen(true)} />
          
          <Navbar.Collapse className="justify-content-end">
            <Nav>
              {/* Heure */}
              <Nav.Item className="d-none d-md-flex align-items-center me-3">
                <span className="text-muted">🕐 {currentTime} - {greeting}</span>
              </Nav.Item>

              {/* Bouton dark mode */}
              <Button
                variant="outline-secondary"
                size="sm"
                className="me-2"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'Mode clair' : 'Mode sombre'}
              >
                {darkMode ? <FiSun /> : <FiMoon />}
              </Button>

              {/* Notifications */}
              <Dropdown align="end" show={showNotifications} onToggle={setShowNotifications}>
                <Dropdown.Toggle as={Button} variant="outline-secondary" size="sm" className="position-relative me-2">
                  <FiBell />
                  {unreadCount > 0 && (
                    <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '10px' }}>
                      {unreadCount}
                    </Badge>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ width: '320px' }}>
                  <Dropdown.Header className="d-flex justify-content-between align-items-center">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <Button variant="link" size="sm" onClick={markAllAsRead} className="p-0">
                        Tout marquer comme lu
                      </Button>
                    )}
                  </Dropdown.Header>
                  {notifications.length === 0 ? (
                    <Dropdown.ItemText>Aucune notification</Dropdown.ItemText>
                  ) : (
                    notifications.map(notif => (
                      <Dropdown.Item 
                        key={notif.id} 
                        onClick={() => markAsRead(notif.id)}
                        className={!notif.read ? 'bg-light' : ''}
                      >
                        <div className="d-flex align-items-start gap-2">
                          <div className="small">
                            <strong>{!notif.read && '🆕 '}</strong>
                            {notif.message}
                          </div>
                        </div>
                      </Dropdown.Item>
                    ))
                  )}
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => navigate('/parametres/notifications')}>
                    Voir toutes
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {/* Menu utilisateur */}
              <Dropdown align="end">
                <Dropdown.Toggle as={Button} variant="outline-primary" size="sm">
                  <FiUser className="me-1" />
                  {user?.full_name?.split(' ')[0] || 'User'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => navigate('/parametres/profil')}>
                    <FiUser className="me-2" /> Mon profil
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => navigate('/parametres/notifications')}>
                    <FiBell className="me-2" /> Notifications
                    {unreadCount > 0 && <Badge bg="danger" pill className="ms-2">{unreadCount}</Badge>}
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="text-danger">
                    <FiLogOut className="me-2" /> Déconnexion
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Offcanvas Sidebar (mobile + desktop) */}
      <Offcanvas show={sidebarOpen} onHide={() => setSidebarOpen(false)} responsive="md" placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>🇨🇩 Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            {filteredMenu.map((item) => (
              <Nav.Link
                key={item.path}
                onClick={() => {
                  navigate(item.path)
                  setSidebarOpen(false)
                }}
                active={isActive(item.path)}
                className="d-flex align-items-center gap-3 py-2"
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.shortcut && (
                  <Badge bg="secondary" className="ms-auto">
                    ⌘+{item.shortcut.toUpperCase()}
                  </Badge>
                )}
              </Nav.Link>
            ))}
            <hr />
            <Nav.Link onClick={() => setShowShortcuts(true)} className="d-flex align-items-center gap-3 py-2">
              <FiHelpCircle size={20} /> Raccourcis clavier
            </Nav.Link>
          </Nav>
          
          {user && (
            <div className="mt-auto pt-3">
              <div className="d-flex align-items-center gap-2 p-2 rounded bg-light">
                <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                  <span className="text-white fw-bold">{user?.full_name?.charAt(0) || 'U'}</span>
                </div>
                <div>
                  <div className="fw-bold">{user?.full_name || 'Utilisateur'}</div>
                  <small className="text-muted">{user?.role || 'Rôle'}</small>
                </div>
              </div>
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Main content - sans double margin */}
      <Container fluid className="pt-5 mt-2">
        <div style={{ paddingTop: '56px' }}>
          <Outlet />
        </div>
      </Container>

      {/* Modal des raccourcis clavier */}
      <ShortcutsModal show={showShortcuts} onHide={() => setShowShortcuts(false)} />

      {/* Toast notifications */}
      <ToastContainer position="bottom-end" className="p-3">
        {toastMessage && (
          <Toast 
            show={true} 
            onClose={() => setToastMessage(null)} 
            delay={3000} 
            autohide
            bg={toastMessage.type === 'success' ? 'success' : 'info'}
          >
            <Toast.Header>
              <strong className="me-auto">Notification</strong>
            </Toast.Header>
            <Toast.Body className={toastMessage.type === 'success' ? 'text-white' : ''}>
              {toastMessage.text}
            </Toast.Body>
          </Toast>
        )}
      </ToastContainer>
    </div>
  )
}

export default BootstrapLayout