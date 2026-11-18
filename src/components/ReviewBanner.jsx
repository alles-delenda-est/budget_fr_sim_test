import { COMMENT_URL } from '../config'
import './ReviewBanner.css'

/** Bandeau fin affiché en haut de chaque page : version de relecture, non publiée. */
export default function ReviewBanner({ commentUrl = COMMENT_URL }) {
  return (
    <div className="review-banner" role="note">
      Version de relecture — chiffres provisoires, non publiée.
      {commentUrl && <> Commentaires : <a href={commentUrl} target="_blank" rel="noopener noreferrer">envoyer un commentaire</a></>}
    </div>
  )
}
