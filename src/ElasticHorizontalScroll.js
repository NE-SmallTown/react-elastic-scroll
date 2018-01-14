/**
 * v0.0.1
 *
 * Copyright (c) 2017
 */
import React from 'react'
import styles from './ElasticHorizontalScroll.css'

function createTransition(property, options) {
  const {duration, easeFunction, delay} = options

  return `${property} ${duration} ${easeFunction} ${delay}`
}

function getScrollDistance(startPageX, endPageX) {
  const distance = endPageX - startPageX

  return {
    distance: distance,
    absDistance: Math.abs(distance),
    direction: distance > 0 ? 'right' : 'left',
  }
}

export default class ElasticHorizontalScroll extends React.Component {
  static defaultProps = {
    springConfig: {
      duration: '0.35s',
      easeFunction: 'cubic-bezier(0.15, 0.3, 0.25, 1)',
      delay: '0s',
    },
    leftMinResponseDistance: 50, // 左滑距离至少达到多少才滚动到下一个 item
    rightMinResponseDistance: 100, // 右滑距离至少达到多少才滚动到上一个 item
    maxLeftOffset: 150, // 第 1 个 contentItem 还能往右滑动的距离
    maxRightOffset: 150, // 最后 1 个 contentItem 还能往右滑动的距离
  }

  state = {
    isFirstRender: true,
    indexLatest: null,
    isDragging: false,
    currentItemIndex: 0,
    containerStyle: {transform: 'translateX(0px)'},
  }

  baseTranslateX = 0

  // axisProperties = this.getAxisProperties()
  //
  // getAxisProperties = () => {
  //   const internal = {transform: {}}
  //
  //   return {
  //     transform: {
  //       set x(v) {
  //         internal.transform.x = `translateX(${v})`
  //       },
  //       get x() {
  //         return internal.transform.x
  //       },
  //     },
  //   }
  // }

  componentDidMount() {
    if (this.firstContentNode && !this.firstContentNodeWidth) {
      setTimeout(() => {
        this.firstContentNodeWidth = parseFloat(
          getComputedStyle(this.firstContentNode).width.slice(0, -2)
        )
        // console.log(this.firstContentNodeWidth, getComputedStyle(document.querySelectorAll('[class*=commodityGroup]')[3]).getPropertyValue('width'))
      }, 0)
      // console.log(JSON.stringify(getComputedStyle(this.firstContentNode)))
      // console.log(this.firstContentNodeWidth, getComputedStyle(document.querySelectorAll('[class*=commodityGroup]')[3]).getPropertyValue('width'))
      // console.log(document.querySelector('[class*=ElasticHorizontalScroll-container]').innerHTML)
    }
    // console.log(11, this.firstContentNodeWidth, getComputedStyle(document.querySelectorAll('[class*=commodityGroup]')[3]).width)

    this.setState({
      isFirstRender: false,
    })
  }

  get contentItemLength() {
    return this.props.children.length
  }

  handleTouchStart = event => {
    this.startPageX = event.touches[0].pageX
    this.setState({
      isDragging: true,
    })
  }

  handleTouchMove = event => {
    const {currentItemIndex, containerStyle} = this.state
    const {maxLeftOffset, maxRightOffset} = this.props

    this.endPageX = event.touches[0].pageX

    const {
      distance: scrollDistance,
      absDistance,
      direction,
    } = getScrollDistance(this.startPageX, this.endPageX)

    // console.log(`this.baseTranslateX: ${this.baseTranslateX}`)
    let retTransformWidth = this.baseTranslateX + scrollDistance
    const absRetTransformWidth = Math.abs(retTransformWidth)
    this.canScrollToAnotherItem = true

    if (currentItemIndex === 0) {
      if (direction === 'right' && absRetTransformWidth > maxLeftOffset) {
        this.canScrollToAnotherItem = false
        retTransformWidth = maxLeftOffset
      }
    } else if (currentItemIndex === this.contentItemLength - 1) {
      if (direction === 'left' && absDistance > maxRightOffset) {
        this.canScrollToAnotherItem = false
        retTransformWidth = this.baseTranslateX - maxRightOffset
      }
    }

    const ret = {
      ...containerStyle,
      transform: `translateX(${retTransformWidth}px)`,
    }

    // console.log(
    //   `direction: ${direction}`,
    //   `currentItemIndex: ${currentItemIndex}`,
    //   `retTransformWidth: ${retTransformWidth}`,
    //   `scrollDistance: ${scrollDistance}`
    // )
    this.setState({
      containerStyle: ret,
    })
  }

  handleTouchEnd = () => {
    // console.log(`startPageX: ${this.startPageX}`, `endPageX: ${this.endPageX}`)
    const {absDistance: absScrollDistance, direction} = getScrollDistance(
      this.startPageX,
      this.endPageX
    )

    const {currentItemIndex} = this.state

    const {leftMinResponseDistance, rightMinResponseDistance} = this.props
    const minResponseDistance =
      direction === 'right' ? rightMinResponseDistance : leftMinResponseDistance

    this.setState({
      isDragging: false,
    })

    // TODO 允许一次滚动两屏，三屏...
    let nextItemIndex = currentItemIndex
    if (absScrollDistance > minResponseDistance) {
      if (
        currentItemIndex >= 0 &&
        currentItemIndex < this.contentItemLength &&
        this.canScrollToAnotherItem
      ) {
        nextItemIndex =
          direction === 'right'
            ? currentItemIndex === 0 ? currentItemIndex : currentItemIndex - 1
            : currentItemIndex === this.contentItemLength - 1
            ? currentItemIndex
            : currentItemIndex + 1
      }
    }

    this.baseTranslateX = -nextItemIndex * this.firstContentNodeWidth
    this.setState({
      currentItemIndex: nextItemIndex,
      containerStyle: {
        ...this.state.containerStyle,
        transform: `translateX(${this.baseTranslateX}px)`,
      },
    })
  }

  render() {
    const {isDragging, isFirstRender} = this.state

    const {springConfig, children} = this.props

    let transition

    if (isDragging) {
      transition = 'all 0s ease 0s'
    } else {
      transition = createTransition('transform', springConfig)
    }

    let containerStyle = {
      transition,
    }

    // Apply the styles for SSR considerations
    if (!isFirstRender) {
      containerStyle = {
        ...containerStyle,
        ...this.state.containerStyle,
        WebkitTransform: this.state.containerStyle.transform,
      }
    }

    return (
      <div
        ref={node => {
          this.rootNode = node
        }}
        className={styles.root}
        onTouchStart={this.handleTouchStart}
        onTouchMove={this.handleTouchMove}
        onTouchEnd={this.handleTouchEnd}
      >
        <div
          ref={node => {
            this.containerNode = node
          }}
          style={containerStyle}
          className={styles.container}
        >
          {React.Children.map(children, (child, index) => {
            if (index === 0) {
              return React.cloneElement(child, {
                ref: v => {
                  this.firstContentNode = v
                },
              })
            }

            return child
          })}
        </div>
      </div>
    )
  }
}