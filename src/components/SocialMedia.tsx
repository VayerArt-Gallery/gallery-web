import {
  FacebookIcon,
  InstagramIcon,
  PinterestIcon,
  YouTubeIcon,
} from './icons/SocialIcons'

interface SocialMediaProps {
  displayStyle: 'grid' | 'flex'
}

const socialMediaLinks = [
  {
    title: 'Facebook',
    link: 'https://www.facebook.com/vayerartgallery?mibextid=wwXIfr',
    icon: FacebookIcon,
  },
  {
    title: 'Instagram',
    link: 'https://www.instagram.com/vayerart_gallery',
    icon: InstagramIcon,
  },
  {
    title: 'Pinterest',
    link: 'https://www.pinterest.com/vayerart/',
    icon: PinterestIcon,
  },
  {
    title: 'YouTube',
    link: 'https://www.youtube.com/@AGGallery',
    icon: YouTubeIcon,
  },
]

export default function SocialMedia({ displayStyle }: SocialMediaProps) {
  return (
    <ul
      className={`${displayStyle === 'grid' ? 'grid grid-cols-2' : 'flex w-full justify-between'} mx-auto gap-3`}
    >
      {socialMediaLinks.map((socialMedia) => {
        const Icon = socialMedia.icon
        return (
          <li key={socialMedia.link} className="text-sm tracking-wide">
            <a
              aria-label={`View VayerArt Gallery's ${socialMedia.title} profile (opens in a new tab).`}
              href={socialMedia.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent text-black transition-colors duration-150 ease-in"
            >
              <Icon classes="w-8" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
