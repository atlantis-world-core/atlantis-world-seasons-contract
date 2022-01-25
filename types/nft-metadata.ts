/**
 * @link
 * https://docs.opensea.io/docs/metadata-standards
 */
export interface NFTMetadata {
  /**
   * @description
   * This is the URL to the image of the item. Can be just about any
   * type of image (including SVGs, which will be cached into PNGs by OpenSea),
   * and can be IPFS URLs or paths. We recommend using a 350 x 350 image.
   */
  image: string;
  /**
   * @description
   * 	Raw SVG image data, if you want to generate images on the fly (not recommended).
   * Only use this if you're not including the image parameter.
   */
  image_data?: string;
  /**
   * @description
   * This is the URL that will appear below the asset's image on OpenSea and will allow
   * users to leave OpenSea and view the item on your site.
   */
  external_url?: string;
  /**
   * @description
   * A human readable description of the item. Markdown is supported.
   */
  description: string;
  /**
   * @description
   * Name of the item.
   */
  name: string;
  /**
   * @description
   * 	These are the attributes for the item, which will show up on the OpenSea page for the item. (see below)
   */
  attributes: NFTAttribute[];
  /**
   * @description
   * Background color of the item on OpenSea. Must be a six-character hexadecimal
   * without a pre-pended #.
   */
  background_color?: string;
  /**
   * @description
   * A URL to a multi-media attachment for the item. The file extensions GLTF, GLB,
   * WEBM, MP4, M4V, OGV, and OGG are supported, along with the audio-only extensions
   * MP3, WAV, and OGA.
   *
   * Animation_url also supports HTML pages, allowing you to build rich experiences and
   * interactive NFTs using JavaScript canvas, WebGL, and more. Scripts and relative paths
   * within the HTML page are now supported. However, access to browser extensions is not
   * supported.
   */
  animation_url?: string;
  /**
   * @description
   * 	A URL to a YouTube video.
   */
  youtube_url?: string;
}

export interface NFTAttribute {
  /**
   * @description
   * The name of the trait.
   */
  trait_type: "birthday" | string;
  /**
   * @description
   * A field indicating how you would like it to be displayed
   */
  display_type?:
    | "date"
    | "boost_percentage"
    | "boost_number"
    | "number"
    | "string"
    | string;
  /**
   * @description
   * The value of the trait.
   */
  value: string | number;
  /**
   * @description
   * Sets a ceiling for a numerical trait's possible values.
   *
   * If you set a `max_value`, make sure not to pass in a higher `value`.
   */
  max_value?: string | number;
}
