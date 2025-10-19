import React, { useState } from 'react'
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  useScrollTrigger,
  Fade,
  useTheme,
  alpha,
  Chip,
} from '@mui/material'
import {
  Group,
  Store,
  YouTube,
  TrendingUp,
  Security,
  Gavel,
  Speed,
  VerifiedUser,
  AttachMoney,
  Rocket,
  KeyboardArrowDown,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import SignUpModal from '../components/SignUpModal'
import ConnectWallet from '../components/ConnectWallet'

const LandingPage: React.FC = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const [signUpOpen, setSignUpOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 50 })

  React.useEffect(() => {
    if (activeAddress) {
      navigate('/dashboard')
    }
  }, [activeAddress, navigate])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const features = [
    {
      icon: <Group sx={{ fontSize: 56 }} />,
      title: 'DAO Governance',
      description: 'Form DAOs with fellow creators to collectively build and govern AI moderators with transparent on-chain voting.',
    },
    {
      icon: <Store sx={{ fontSize: 56 }} />,
      title: 'AI Marketplace',
      description: 'Buy, sell, and subscribe to AI moderators trained for specific communities and use cases.',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 56 }} />,
      title: 'Revenue Sharing',
      description: 'Monetize through subscriptions, pay-per-use, or outright sales with automatic DAO distribution.',
    },
    {
      icon: <YouTube sx={{ fontSize: 56 }} />,
      title: 'YouTube Integration',
      description: 'Seamlessly connect your YouTube channel for real-time live chat moderation powered by AI.',
    },
  ]

  const benefits = [
    {
      icon: <Speed />,
      title: 'Lightning Fast',
      description: 'Built on Algorand for instant transactions and real-time moderation.',
    },
    {
      icon: <VerifiedUser />,
      title: 'Fully Decentralized',
      description: 'No central authority. Complete ownership and control by DAO members.',
    },
    {
      icon: <AttachMoney />,
      title: 'Low Costs',
      description: 'Algorand\'s minimal transaction fees make it economically viable at scale.',
    },
    {
      icon: <Gavel />,
      title: 'Transparent Governance',
      description: 'All decisions, revenue, and operations recorded immutably on-chain.',
    },
  ]

  const stats = [
    { value: '$8B+', label: 'Creator Economy Size' },
    { value: '50M+', label: 'Content Creators' },
    { value: '24/7', label: 'AI Moderation' },
    { value: '100%', label: 'Transparent Revenue' },
  ]

  return (
    <Box sx={{ backgroundColor: 'background.default' }}>
      {/* Fixed Navbar */}
      <AppBar
        position="fixed"
        elevation={trigger ? 4 : 0}
        sx={{
          backgroundColor: trigger ? alpha(theme.palette.background.paper, 0.95) : 'transparent',
          backdropFilter: trigger ? 'blur(20px)' : 'none',
          transition: 'all 0.3s ease-in-out',
          borderBottom: trigger ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(45deg, #FF6B00 30%, #FF8C00 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                CitadelX
              </Typography>
            </Box>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
              <Button
                color="inherit"
                onClick={() => scrollToSection('features')}
                sx={{ fontSize: '0.95rem', fontWeight: 500 }}
              >
                Features
              </Button>
              <Button
                color="inherit"
                onClick={() => scrollToSection('how-it-works')}
                sx={{ fontSize: '0.95rem', fontWeight: 500 }}
              >
                How It Works
              </Button>
              <Button
                color="inherit"
                onClick={() => scrollToSection('benefits')}
                sx={{ fontSize: '0.95rem', fontWeight: 500 }}
              >
                Benefits
              </Button>
              <Button
                variant="outlined"
                onClick={() => setLoginOpen(true)}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.light',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                onClick={() => setSignUpOpen(true)}
                sx={{
                  boxShadow: '0 4px 14px 0 rgba(255, 107, 0, 0.4)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(255, 107, 0, 0.6)',
                  },
                }}
              >
                Get Started
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section - 100vh */}
      <Box
        id="hero"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%)',
        }}
      >
        {/* Animated Background */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 20% 50%, rgba(255, 107, 0, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 140, 0, 0.15) 0%, transparent 50%)',
            animation: 'pulse 8s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.6 },
            },
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, textAlign: 'center', py: 10 }}>
          <Fade in timeout={1000}>
            <Box>
              <Chip
                label="Built on Algorand"
                sx={{
                  mb: 3,
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              />
            <Typography
              variant="h1"
              sx={{
                mb: 3,
                  fontSize: { xs: '3rem', md: '4.5rem', lg: '5.5rem' },
                  fontWeight: 900,
                  background: 'linear-gradient(45deg, #FF6B00 30%, #FF8C00 70%, #FFB800 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1,
              }}
            >
                Decentralized AI
                <br />
                Moderation Platform
            </Typography>
            <Typography
                variant="h4"
                sx={{
                  mb: 2,
                  color: 'text.primary',
                  fontWeight: 600,
                  maxWidth: 900,
                  mx: 'auto',
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                Transform AI Moderation into a Thriving Economic Primitive
            </Typography>
            <Typography
              variant="h6"
                sx={{
                  mb: 5,
                  color: 'text.secondary',
                  maxWidth: 800,
                  mx: 'auto',
                  lineHeight: 1.8,
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                Empower creators to form DAOs, train custom AI moderators, and generate sustainable revenue
                through a decentralized marketplace ecosystem.
            </Typography>
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                  startIcon={<Rocket />}
                onClick={() => setSignUpOpen(true)}
                sx={{
                    px: 5,
                    py: 2,
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    boxShadow: '0 8px 32px rgba(255, 107, 0, 0.4)',
                    '&:hover': {
                      boxShadow: '0 12px 48px rgba(255, 107, 0, 0.6)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Get Started Free
              </Button>
              <Button
                variant="outlined"
                size="large"
                  onClick={() => scrollToSection('features')}
                sx={{
                    px: 5,
                    py: 2,
                    fontSize: '1.2rem',
                    fontWeight: 600,
                  borderColor: 'primary.main',
                  color: 'primary.main',
                    borderWidth: 2,
                  '&:hover': {
                      borderWidth: 2,
                    borderColor: 'primary.light',
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                  Learn More
              </Button>
            </Box>
          </Box>
          </Fade>
          <IconButton
            onClick={() => scrollToSection('stats')}
            sx={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'bounce 2s infinite',
              '@keyframes bounce': {
                '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
                '50%': { transform: 'translateX(-50%) translateY(-10px)' },
              },
            }}
          >
            <KeyboardArrowDown sx={{ fontSize: 48, color: 'primary.main' }} />
          </IconButton>
        </Container>
      </Box>

      {/* Stats Section - 100vh */}
      <Box
        id="stats"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'background.paper',
          position: 'relative',
        }}
      >
      <Container maxWidth="lg" sx={{ py: 10 }}>
          <Grid container spacing={4} sx={{ mb: 8 }}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 900,
                      color: 'primary.main',
                      mb: 1,
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={6} alignItems="center" sx={{ mt: 6 }}>
          <Grid item xs={12} md={6}>
              <Box sx={{ pr: { md: 4 } }}>
                <Typography
                  variant="overline"
                  sx={{ color: 'primary.main', fontWeight: 700, fontSize: '1rem', letterSpacing: 2 }}
                >
              The Problem
            </Typography>
                <Typography variant="h3" sx={{ mb: 3, fontWeight: 800, mt: 2 }}>
                  Creator Economy Needs Better Moderation
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', fontSize: '1.15rem', lineHeight: 1.8 }}>
                  The creator economy faces a critical bottleneck: the high cost and limited scalability of human
                  chat moderation. This creates significant challenges for content creators worldwide.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    'Toxic communities driving viewers away',
                    'Lost engagement and revenue opportunities',
                    'Reputational damage to creators and brands',
                    'Inability to scale moderation with growth',
                  ].map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.05rem' }}>
                        {item}
            </Typography>
                    </Box>
                  ))}
                </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
              <Card
                sx={{
                  p: 4,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Security sx={{ fontSize: 72, color: 'primary.main', mb: 3 }} />
                <Typography
                  variant="overline"
                  sx={{ color: 'primary.main', fontWeight: 700, fontSize: '1rem', letterSpacing: 2 }}
                >
                  The Solution
                </Typography>
                <Typography variant="h3" sx={{ mb: 3, fontWeight: 800, mt: 2 }}>
                  Decentralized AI Ecosystem
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.15rem', lineHeight: 1.8 }}>
                  CitadelX transforms AI moderation into a decentralized, self-sustaining ecosystem. Creators form
                  DAOs to train contextual AI moderators, list them in our marketplace, and share revenue among all
                  members. Built on Algorand for speed, security, and transparency.
                </Typography>
            </Card>
          </Grid>
        </Grid>
      </Container>
      </Box>

      {/* How It Works Section - 100vh */}
      <Box
        id="how-it-works"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 100%)',
          position: 'relative',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 10 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', fontWeight: 700, fontSize: '1rem', letterSpacing: 2 }}
            >
              Process
            </Typography>
            <Typography variant="h2" sx={{ mb: 3, fontWeight: 800, mt: 2 }}>
              How CitadelX Works
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto' }}>
              Three simple steps to transform your content moderation into a revenue-generating asset
          </Typography>
          </Box>
          <Grid container spacing={4}>
            {[
              {
                number: '01',
                title: 'Form a DAO',
                description:
                  'Create or join a DAO with fellow creators. Pool resources and expertise to build powerful AI moderators. Stake tokens and participate in transparent governance.',
                icon: <Group />,
              },
              {
                number: '02',
                title: 'Train AI Moderator',
                description:
                  'Provide context documents, moderation rules, and training data. Your DAO collectively trains a custom AI moderator tailored to your community\'s needs.',
                icon: <Security />,
              },
              {
                number: '03',
                title: 'Earn & Share Revenue',
                description:
                  'List your moderator in the marketplace. Choose subscription, pay-per-use, or outright sale models. Revenue is automatically distributed to DAO members on-chain.',
                icon: <TrendingUp />,
              },
            ].map((step, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    p: 4,
                    backgroundColor: alpha(theme.palette.background.paper, 0.5),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.3)}`,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      color: 'primary.main',
                        fontWeight: 900,
                        opacity: 0.2,
                        fontSize: '4rem',
                    }}
                  >
                    {step.number}
                  </Typography>
                    <Box sx={{ color: 'primary.main', '& > svg': { fontSize: 48 } }}>{step.icon}</Box>
                  </Box>
                  <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.05rem', lineHeight: 1.7 }}>
                    {step.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section - 100vh */}
      <Box
        id="features"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'background.paper',
        }}
      >
      <Container maxWidth="lg" sx={{ py: 10 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', fontWeight: 700, fontSize: '1rem', letterSpacing: 2 }}
            >
              Platform Features
            </Typography>
            <Typography variant="h2" sx={{ mb: 3, fontWeight: 800, mt: 2 }}>
              Everything You Need
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto' }}>
              Comprehensive tools for creators to build, deploy, and monetize AI moderation solutions
        </Typography>
          </Box>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    p: 4,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.2)}`,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  <Box sx={{ color: 'primary.main', mb: 3 }}>{feature.icon}</Box>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                  {feature.title}
                </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.05rem', lineHeight: 1.7 }}>
                  {feature.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
      </Box>

      {/* Benefits Section - 100vh */}
      <Box
        id="benefits"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%)',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 10 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', fontWeight: 700, fontSize: '1rem', letterSpacing: 2 }}
            >
              Why CitadelX
            </Typography>
            <Typography variant="h2" sx={{ mb: 3, fontWeight: 800, mt: 2 }}>
              Built for the Future
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 700, mx: 'auto' }}>
              Leveraging cutting-edge blockchain technology for unparalleled performance and trust
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {benefits.map((benefit, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 3,
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                      color: 'primary.main',
                      mb: 3,
                      '& > svg': { fontSize: 40 },
                    }}
                  >
                    {benefit.icon}
                  </Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    {benefit.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '1rem', lineHeight: 1.7 }}>
                    {benefit.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section - 100vh */}
      <Box
        id="cta"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C00 50%, #FFB800 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center', py: 10 }}>
          <Typography
            variant="h2"
            sx={{
              mb: 3,
              fontWeight: 900,
              color: 'white',
              fontSize: { xs: '2.5rem', md: '3.5rem' },
            }}
          >
            Ready to Transform Your Community?
          </Typography>
          <Typography
            variant="h5"
            sx={{
              mb: 5,
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              maxWidth: 700,
              mx: 'auto',
            }}
          >
            Join thousands of creators building the future of decentralized AI moderation. Start your journey today
            with zero upfront costs.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Rocket />}
              onClick={() => setSignUpOpen(true)}
              sx={{
                px: 6,
                py: 2.5,
                fontSize: '1.3rem',
                fontWeight: 700,
                backgroundColor: 'white',
                color: 'primary.main',
                boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 16px 64px rgba(0, 0, 0, 0.4)',
                  transform: 'translateY(-4px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Get Started Now
            </Button>
          </Box>
          <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            {['No Credit Card Required', 'Free to Start', 'Built on Algorand'].map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedUser sx={{ color: 'white', fontSize: 20 }} />
                <Typography sx={{ color: 'white', fontWeight: 600 }}>{item}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: '#0A0A0A',
          borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          py: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Security sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(45deg, #FF6B00 30%, #FF8C00 90%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  CitadelX
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                Decentralized AI Moderation Platform built on Algorand. Empowering creators to build, share, and
                monetize AI moderators through DAO governance.
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={4}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    Platform
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {['Features', 'Marketplace', 'DAOs', 'Documentation'].map((link, idx) => (
                      <Button
                        key={idx}
                        sx={{
                          justifyContent: 'flex-start',
                          color: 'text.secondary',
                          textTransform: 'none',
                          p: 0,
                          minWidth: 0,
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        {link}
                      </Button>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    Resources
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {['Blog', 'Guides', 'Support', 'API Docs'].map((link, idx) => (
                      <Button
                        key={idx}
                        sx={{
                          justifyContent: 'flex-start',
                          color: 'text.secondary',
                          textTransform: 'none',
                          p: 0,
                          minWidth: 0,
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        {link}
                      </Button>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    Company
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {['About', 'Careers', 'Contact', 'Legal'].map((link, idx) => (
                      <Button
                        key={idx}
                        sx={{
                          justifyContent: 'flex-start',
                          color: 'text.secondary',
                          textTransform: 'none',
                          p: 0,
                          minWidth: 0,
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        {link}
                      </Button>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    Social
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {['Twitter', 'Discord', 'GitHub', 'LinkedIn'].map((link, idx) => (
                      <Button
                        key={idx}
                        sx={{
                          justifyContent: 'flex-start',
                          color: 'text.secondary',
                          textTransform: 'none',
                          p: 0,
                          minWidth: 0,
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        {link}
                      </Button>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Box
            sx={{
              pt: 4,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              © 2025 CitadelX. All rights reserved. Built on Algorand.
          </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link, idx) => (
                <Button
                  key={idx}
                  sx={{
                    color: 'text.secondary',
                    textTransform: 'none',
                    p: 0,
                    minWidth: 0,
                    fontSize: '0.875rem',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {link}
                </Button>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Modals */}
      <SignUpModal open={signUpOpen} onClose={() => setSignUpOpen(false)} />
      <ConnectWallet openModal={loginOpen} closeModal={() => setLoginOpen(false)} />
    </Box>
  )
}

export default LandingPage


